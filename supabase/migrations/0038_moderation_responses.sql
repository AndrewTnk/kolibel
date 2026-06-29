-- ============================================================
-- 0038_moderation_responses.sql
-- Ответы модерации автору жалобы (уведомление + модалка) + правки RPC жалоб:
--   • targetProfileId в детали жалобы (кнопка «Перейти» → профиль виновника)
--   • поиск постов/комментариев по ID (быстрый поиск из жалобы)
-- Применять ПОСЛЕ 0037. Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Ответы модерации (видит только получатель — автор жалобы) -----------
create table if not exists public.moderation_responses (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade, -- автор жалобы
  report_id   uuid        references public.reports (id) on delete set null,
  category    text        not null default '',          -- название жалобы
  resolution  text        not null check (resolution in ('measures', 'reject')),
  comment     text        not null default '',          -- комментарий модерации
  created_at  timestamptz not null default now()
);
create index if not exists moderation_responses_user_idx on public.moderation_responses (user_id, created_at desc);

alter table public.moderation_responses enable row level security;

drop policy if exists moderation_responses_select_own on public.moderation_responses;
create policy moderation_responses_select_own on public.moderation_responses for select
  using (user_id = auth.uid());
-- INSERT только через security-definer RPC (admin_resolve_report) — прямой политики нет.

-- 2) Тип уведомления 'moderation' ----------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('application', 'message', 'follow', 'vacancy', 'system',
                  'like', 'comment', 'comment_like', 'reply', 'moderation'));

-- 3) Резолюция жалобы + уведомление автору -------------------------------
--    measures/warn/block → 'resolved' (+ блок цели для block), reject → 'rejected'.
--    Автору жалобы шлём ответ (moderation_responses) + уведомление kind 'moderation'.
create or replace function public.admin_resolve_report(p_id uuid, p_resolution text, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.reports%rowtype;
  v_kind text;            -- 'measures' | 'reject' (для шаблона ответа)
  v_resp uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.reports where id = p_id;
  if not found then raise exception 'report not found'; end if;
  -- Решение уже принято — повторно отвечать нельзя (защита от дубля ответа автору).
  if r.status in ('resolved', 'rejected') then
    raise exception 'Жалоба уже обработана' using errcode = '42501';
  end if;

  if p_resolution = 'block' then
    -- Блокируем цель софт-статусом по типу
    if r.target_type in ('user', 'company') then
      update public.profiles set status = 'blocked' where id = r.target_id;
    elsif r.target_type = 'post' then
      update public.posts set removed_at = now() where id = r.target_id;
    elsif r.target_type = 'comment' then
      update public.post_comments set removed_at = now() where id = r.target_id;
    elsif r.target_type = 'vacancy' then
      update public.vacancies set moderation = 'removed' where id = r.target_id;
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

  -- Ответ автору жалобы (если автор известен)
  if r.reporter_id is not null then
    insert into public.moderation_responses (user_id, report_id, category, resolution, comment)
      values (r.reporter_id, p_id, r.category, v_kind, coalesce(p_note, ''))
      returning id into v_resp;
    insert into public.notifications (user_id, actor_id, kind, title, body, entity_id)
      values (r.reporter_id, null, 'moderation', 'Решение по вашей жалобе', '', v_resp);
  end if;
end; $$;

-- 4) Деталь жалобы + targetProfileId (профиль виновника для «Перейти») ----
create or replace function public.get_admin_report(p_id uuid)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare r public.reports%rowtype; v_content jsonb; v_history jsonb; v_target_profile uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.reports where id = p_id;
  if not found then return null; end if;

  -- Профиль виновника (для кнопки «Перейти»)
  if r.target_type in ('user', 'company') then
    v_target_profile := r.target_id;
  elsif r.target_type = 'post' then
    select author_id into v_target_profile from public.posts where id = r.target_id;
  elsif r.target_type = 'comment' then
    select author_id into v_target_profile from public.post_comments where id = r.target_id;
  elsif r.target_type = 'vacancy' then
    select company_id into v_target_profile from public.vacancies where id = r.target_id;
  end if;

  -- Превью контента (+ ID для быстрого поиска в разделе «Публикации»)
  if r.target_type = 'post' then
    select jsonb_build_object('kind', 'post',
      'text', coalesce((select string_agg(b ->> 'text', ' ') from jsonb_array_elements(content) b where b ->> 'type' = 'text'), ''),
      'postId', id, 'createdAt', created_at, 'removed', removed_at is not null)
      into v_content from public.posts where id = r.target_id;
  elsif r.target_type = 'comment' then
    select jsonb_build_object('kind', 'comment', 'text', content, 'commentId', id, 'postId', post_id,
                             'createdAt', created_at, 'removed', removed_at is not null)
      into v_content from public.post_comments where id = r.target_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'action', a.action, 'note', a.note, 'createdAt', a.created_at,
    'actor', public.admin_actor(a.actor_id)) order by a.created_at), '[]'::jsonb)
    into v_history from public.report_actions a where a.report_id = p_id;

  return jsonb_build_object(
    'id', r.id, 'category', r.category, 'description', r.description,
    'targetType', r.target_type, 'target', public.admin_entity(r.target_type, r.target_id),
    'targetProfileId', v_target_profile,
    'reporter', public.admin_actor(r.reporter_id), 'assigned', public.admin_actor(r.assigned_to),
    'priority', r.priority, 'status', r.status, 'moderatorComment', r.moderator_comment,
    'evidence', r.evidence, 'createdAt', r.created_at, 'updatedAt', r.updated_at,
    'content', v_content, 'history', v_history
  );
end; $$;

-- 5) Поиск постов по ID (помимо имени автора) ----------------------------
create or replace function public.get_admin_posts(
  p_search text default '', p_state text default '', p_limit int default 20, p_offset int default 0)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare v_rows jsonb; v_total int;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  select count(*) into v_total
  from public.posts pt
  where (coalesce(p_search, '') = '' or pt.author_name ilike '%' || p_search || '%' or pt.id::text ilike '%' || p_search || '%')
    and (p_state = '' or (p_state = 'removed') = (pt.removed_at is not null));

  select coalesce(jsonb_agg(x order by created_at desc), '[]'::jsonb) into v_rows from (
    select pt.created_at, jsonb_build_object(
      'id', pt.id, 'authorId', pt.author_id, 'authorName', coalesce(nullif(pt.author_name, ''), 'Пользователь'),
      'authorAvatar', pt.author_avatar, 'authorKind', coalesce(pt.author_kind, 'user'),
      'excerpt', coalesce((select string_agg(b ->> 'text', ' ') from jsonb_array_elements(pt.content) b where b ->> 'type' = 'text'), ''),
      'createdAt', pt.created_at, 'removed', pt.removed_at is not null,
      'likeCount', (select count(*) from public.post_likes pl where pl.post_id = pt.id),
      'commentCount', (select count(*) from public.post_comments pc where pc.post_id = pt.id and pc.removed_at is null)) x
    from public.posts pt
    where (coalesce(p_search, '') = '' or pt.author_name ilike '%' || p_search || '%' or pt.id::text ilike '%' || p_search || '%')
      and (p_state = '' or (p_state = 'removed') = (pt.removed_at is not null))
    order by pt.created_at desc limit p_limit offset p_offset
  ) s;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end; $$;

-- 6) Поиск комментариев по ID коммента или ID поста ----------------------
create or replace function public.get_admin_comments(
  p_search text default '', p_state text default '', p_limit int default 20, p_offset int default 0)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare v_rows jsonb; v_total int;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  select count(*) into v_total
  from public.post_comments pc
  where (coalesce(p_search, '') = '' or pc.author_name ilike '%' || p_search || '%' or pc.content ilike '%' || p_search || '%'
         or pc.id::text ilike '%' || p_search || '%' or pc.post_id::text ilike '%' || p_search || '%')
    and (p_state = '' or (p_state = 'removed') = (pc.removed_at is not null));

  select coalesce(jsonb_agg(x order by created_at desc), '[]'::jsonb) into v_rows from (
    select pc.created_at, jsonb_build_object(
      'id', pc.id, 'postId', pc.post_id, 'authorId', pc.author_id,
      'authorName', coalesce(nullif(pc.author_name, ''), 'Пользователь'), 'authorAvatar', pc.author_avatar,
      'content', pc.content, 'createdAt', pc.created_at, 'removed', pc.removed_at is not null) x
    from public.post_comments pc
    where (coalesce(p_search, '') = '' or pc.author_name ilike '%' || p_search || '%' or pc.content ilike '%' || p_search || '%'
           or pc.id::text ilike '%' || p_search || '%' or pc.post_id::text ilike '%' || p_search || '%')
      and (p_state = '' or (p_state = 'removed') = (pc.removed_at is not null))
    order by pc.created_at desc limit p_limit offset p_offset
  ) s;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end; $$;
