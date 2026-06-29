-- ============================================================
-- 0039_account_block_content_removal.sql
-- Блокировка аккаунта с причиной (+ экран блокировки при входе) и удаление
-- контента (постов/комментов/вакансий) с уведомлением нарушителю.
--   • profiles.block_reason / block_message — причина и сообщение блокировки
--     (показываются заблокированному при входе);
--   • is_account_blocked() + RLS: контент заблокированного автора пропадает
--     из публичных выборок (видят staff и сам автор там, где это уместно);
--   • moderation_responses += kind/reason — теперь это И ответ автору жалобы,
--     И уведомление нарушителю об удалении контента (одна модалка, разный текст);
--   • admin_set_account_status — расширена причиной/сообщением;
--   • admin_remove_content — единое удаление контента + уведомление автору;
--   • admin_resolve_report — переписана: только measures/reject; measures
--     применяет меру автоматически по типу цели и уведомляет обе стороны.
-- Применять ПОСЛЕ 0038. Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Причина/сообщение блокировки аккаунта -------------------------------
alter table public.profiles
  add column if not exists block_reason  text not null default '',
  add column if not exists block_message text not null default '';

-- 2) Хелпер: заблокирован ли аккаунт (security definer — читает в обход RLS) -
create or replace function public.is_account_blocked(p_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = p_id and status = 'blocked');
$$;

-- 3) RLS: прячем контент заблокированных авторов из публичных выборок -----
--    (staff видят всё; владелец вакансии — свою). Дополняет правило removed_at из 0036.
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select
  using (
    public.is_staff()
    or (removed_at is null and not public.is_account_blocked(author_id))
  );

drop policy if exists post_comments_select on public.post_comments;
create policy post_comments_select on public.post_comments for select
  using (
    public.is_staff()
    or (removed_at is null and not public.is_account_blocked(author_id))
  );

drop policy if exists vacancies_select_all on public.vacancies;
create policy vacancies_select_all on public.vacancies for select
  using (
    (coalesce(status, 'active') <> 'draft' or auth.uid() = company_id)
    and (coalesce(moderation, 'visible') = 'visible' or auth.uid() = company_id or public.is_staff())
    and (not public.is_account_blocked(company_id) or auth.uid() = company_id or public.is_staff())
  );

-- 4) moderation_responses: обобщаем под две аудитории --------------------
--    kind: 'report_result' (автору жалобы) | 'content_removed' | 'vacancy_removed'
--          | 'account_blocked' (нарушителю). reason — короткая причина (для модалки).
alter table public.moderation_responses
  add column if not exists kind   text not null default 'report_result',
  add column if not exists reason text not null default '';

alter table public.moderation_responses drop constraint if exists moderation_responses_kind_check;
alter table public.moderation_responses add constraint moderation_responses_kind_check
  check (kind in ('report_result', 'content_removed', 'vacancy_removed', 'account_blocked'));

-- 5) Статус аккаунта + причина/сообщение блокировки ----------------------
drop function if exists public.admin_set_account_status(uuid, text);
create or replace function public.admin_set_account_status(
  p_id uuid, p_status text, p_reason text default '', p_message text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('active', 'blocked', 'deleted') then raise exception 'bad status'; end if;
  if p_status = 'blocked' then
    update public.profiles
      set status = 'blocked',
          block_reason = coalesce(p_reason, ''),
          block_message = coalesce(p_message, '')
      where id = p_id;
  else
    -- Разблокировка/восстановление — чистим причину.
    update public.profiles
      set status = p_status, block_reason = '', block_message = ''
      where id = p_id;
  end if;
end; $$;

-- 6) Единое удаление контента + уведомление автору (нарушителю) ----------
create or replace function public.admin_remove_content(
  p_type text, p_id uuid, p_reason text default '', p_message text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_cat text; v_kind text; v_resp uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_type = 'post' then
    update public.posts set removed_at = now() where id = p_id returning author_id into v_author;
    v_cat := 'Публикация'; v_kind := 'content_removed';
  elsif p_type = 'comment' then
    update public.post_comments set removed_at = now() where id = p_id returning author_id into v_author;
    v_cat := 'Комментарий'; v_kind := 'content_removed';
  elsif p_type = 'vacancy' then
    update public.vacancies set moderation = 'removed' where id = p_id returning company_id into v_author;
    v_cat := 'Вакансия'; v_kind := 'vacancy_removed';
  else
    raise exception 'bad type';
  end if;

  -- Уведомляем автора удалённого контента (та же модалка, что и ответ по жалобе).
  if v_author is not null then
    insert into public.moderation_responses (user_id, report_id, category, kind, resolution, reason, comment)
      values (v_author, null, v_cat, v_kind, 'measures', coalesce(p_reason, ''), coalesce(p_message, ''))
      returning id into v_resp;
    insert into public.notifications (user_id, actor_id, kind, title, body, entity_id)
      values (v_author, null, 'moderation', 'Ваш контент удалён модерацией', '', v_resp);
  end if;
end; $$;

-- 7) Резолюция жалобы: только measures/reject; measures — авто по типу цели -
--    post/comment → удалить + уведомить автора; vacancy → снять + уведомить компанию;
--    user/company → заблокировать аккаунт (с причиной). Автору жалобы — ответ всегда.
create or replace function public.admin_resolve_report(
  p_id uuid, p_resolution text, p_note text default '', p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.reports%rowtype;
  v_kind text;      -- ответ автору жалобы: measures|reject
  v_resp uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.reports where id = p_id;
  if not found then raise exception 'report not found'; end if;
  if r.status in ('resolved', 'rejected') then
    raise exception 'Жалоба уже обработана' using errcode = '42501';
  end if;
  if p_resolution not in ('measures', 'reject') then raise exception 'bad resolution'; end if;

  -- Применяем меру по типу цели (+ уведомление нарушителю — внутри хелперов).
  if p_resolution = 'measures' then
    if r.target_type in ('post', 'comment', 'vacancy') then
      perform public.admin_remove_content(r.target_type, r.target_id, p_reason, p_note);
    elsif r.target_type in ('user', 'company') then
      perform public.admin_set_account_status(r.target_id, 'blocked', p_reason, p_note);
    end if;
  end if;

  v_kind := case when p_resolution = 'reject' then 'reject' else 'measures' end;

  update public.reports set
    status = case when p_resolution = 'reject' then 'rejected' else 'resolved' end,
    assigned_to = coalesce(assigned_to, auth.uid()),
    moderator_comment = case when coalesce(p_note, '') <> '' then p_note else moderator_comment end
    where id = p_id;

  insert into public.report_actions (report_id, actor_id, action, note)
    values (p_id, auth.uid(), p_resolution, coalesce(p_note, ''));

  -- Ответ автору жалобы (если автор известен).
  if r.reporter_id is not null then
    insert into public.moderation_responses (user_id, report_id, category, kind, resolution, reason, comment)
      values (r.reporter_id, p_id, r.category, 'report_result', v_kind, coalesce(p_reason, ''), coalesce(p_note, ''))
      returning id into v_resp;
    insert into public.notifications (user_id, actor_id, kind, title, body, entity_id)
      values (r.reporter_id, null, 'moderation', 'Решение по вашей жалобе', '', v_resp);
  end if;
end; $$;
