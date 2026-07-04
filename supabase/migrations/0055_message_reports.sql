-- ============================================================
-- 0055: Жалобы на сообщения чата + «предупреждение» как мера.
--
-- Контекстное меню сообщения получает пункт «Пожаловаться» → жалоба с
-- target_type = 'message'. В карточке жалобы (админка) в «Объекте жалобы»
-- показывается САМ ТЕКСТ сообщения (иначе его никак не найти — сообщения
-- нигде не ищутся) + ID. «Принять меры» по сообщению = ТОЛЬКО ПРЕДУПРЕЖДЕНИЕ
-- отправителю (решение владельца 2026-07-04): нарушитель получает
-- moderation_response kind 'warning' (причина + комментарий модератора),
-- без удаления сообщения и без блокировки.
--
-- Применить: Supabase Dashboard → SQL Editor → вставить целиком → Run. Идемпотентно.
-- ============================================================

-- 1) reports.target_type += 'message' ---------------------------------------

alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('user', 'company', 'post', 'comment', 'vacancy', 'message'));

-- 2) moderation_responses.kind += 'warning' ----------------------------------

alter table public.moderation_responses drop constraint if exists moderation_responses_kind_check;
alter table public.moderation_responses add constraint moderation_responses_kind_check
  check (kind in ('report_result', 'content_removed', 'vacancy_removed', 'account_blocked', 'warning'));

-- 3) submit_report: разрешить цель 'message' (копия 0048, изменена проверка) --

create or replace function public.submit_report(
  p_target_type text,
  p_target_id   uuid,
  p_category    text,
  p_description text,
  p_evidence    jsonb default '[]'::jsonb
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me     uuid := auth.uid();
  v_report uuid;
  v_conv   uuid;
begin
  if v_me is null then
    raise exception 'Нужно войти, чтобы отправить жалобу';
  end if;
  if p_target_type not in ('user', 'company', 'post', 'comment', 'vacancy', 'message') then
    raise exception 'Некорректный тип цели';
  end if;

  insert into public.reports (reporter_id, target_type, target_id, category, description, evidence)
  values (v_me, p_target_type, p_target_id, coalesce(p_category, ''),
          coalesce(p_description, ''), coalesce(p_evidence, '[]'::jsonb))
  returning id into v_report;

  v_conv := public.ensure_support_conversation();

  insert into public.messages (conversation_id, sender_id, body, attach)
  values (
    v_conv, v_me, '',
    jsonb_build_object(
      'kind',           'report',
      'title',          'Жалоба #' || left(v_report::text, 8),
      'reportId',       v_report::text,
      'reportCategory', coalesce(p_category, ''),
      'reportStatus',   'new'
    )
  );

  return v_report;
end;
$$;

-- 4) admin_entity: ветка 'message' (актор = отправитель) ---------------------

create or replace function public.admin_entity(p_type text, p_id uuid)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare r jsonb;
begin
  if p_type in ('user', 'company') then
    return public.admin_actor(p_id) || jsonb_build_object('sub', case when p_type = 'company' then 'Компания' else 'Пользователь' end);
  elsif p_type = 'post' then
    select jsonb_build_object('id', id, 'name', coalesce(nullif(author_name, ''), 'Пользователь'),
                             'avatar', author_avatar, 'kind', coalesce(author_kind, 'user'), 'sub', 'Публикация')
      into r from public.posts where id = p_id;
  elsif p_type = 'comment' then
    select jsonb_build_object('id', id, 'name', coalesce(nullif(author_name, ''), 'Пользователь'),
                             'avatar', author_avatar, 'kind', coalesce(author_kind, 'user'), 'sub', 'Комментарий')
      into r from public.post_comments where id = p_id;
  elsif p_type = 'vacancy' then
    select jsonb_build_object('id', v.id, 'name', coalesce(nullif(v.title, ''), 'Вакансия'),
                             'avatar', c.logo_url, 'kind', 'vacancy',
                             'sub', coalesce(nullif(v.company, ''), c.name, 'Вакансия'))
      into r from public.vacancies v left join public.companies c on c.id = v.company_id where v.id = p_id;
  elsif p_type = 'message' then
    -- Сообщение чата: показываем отправителя (для строки «На кого» в списке жалоб).
    select public.admin_actor(m.sender_id) || jsonb_build_object('sub', 'Сообщение')
      into r from public.messages m where m.id = p_id;
  end if;
  return coalesce(r, jsonb_build_object('id', p_id, 'name', '—', 'avatar', null, 'kind', p_type, 'sub', p_type));
end; $$;

-- 5) get_admin_report: превью сообщения + профиль отправителя ----------------

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
  elsif r.target_type = 'message' then
    select sender_id into v_target_profile from public.messages where id = r.target_id;
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
  elsif r.target_type = 'message' then
    -- Текст сообщения показываем ЦЕЛИКОМ — иначе объект жалобы никак не найти
    -- (сообщения не ищутся по разделам). Если сообщение уже удалено автором —
    -- v_content останется null (в карточке блока «Объект жалобы» не будет).
    select jsonb_build_object('kind', 'message',
      'text', case when coalesce(m.body, '') <> '' then m.body
                   else coalesce('Вложение: ' || nullif(m.attach ->> 'title', ''), '(без текста)') end,
      'messageId', m.id, 'createdAt', m.created_at, 'removed', false)
      into v_content from public.messages m where m.id = r.target_id;
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

-- 6) admin_resolve_report: меры по сообщению = предупреждение отправителю ----
--    (копия 0053; добавлена ветка 'message' в блоке measures)

create or replace function public.admin_resolve_report(
  p_id uuid, p_resolution text, p_note text default '', p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.reports%rowtype;
  v_kind text;
  v_resp uuid;
  v_conv uuid;
  v_reporter_comment text;
  v_offender uuid;
  v_resp2 uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.reports where id = p_id;
  if not found then raise exception 'report not found'; end if;
  if r.status in ('resolved', 'rejected') then
    raise exception 'Жалоба уже обработана' using errcode = '42501';
  end if;
  if p_resolution not in ('measures', 'reject') then raise exception 'bad resolution'; end if;

  if p_resolution = 'measures' then
    if r.target_type in ('post', 'comment', 'vacancy') then
      perform public.admin_remove_content(r.target_type, r.target_id, p_reason, p_note);
    elsif r.target_type in ('user', 'company') then
      perform public.admin_set_account_status(r.target_id, 'blocked', p_reason, p_note);
    elsif r.target_type = 'message' then
      -- Меры по сообщению = ТОЛЬКО предупреждение отправителю (без удаления/блокировки).
      -- Если сообщение уже удалено автором — предупреждать некого, жалоба просто закрывается.
      select sender_id into v_offender from public.messages where id = r.target_id;
      if v_offender is not null then
        insert into public.moderation_responses (user_id, report_id, category, kind, resolution, reason, comment)
          values (v_offender, p_id, r.category, 'warning', 'measures', coalesce(p_reason, ''), coalesce(p_note, ''))
          returning id into v_resp2;
        insert into public.notifications (user_id, actor_id, kind, title, body, entity_id)
          values (v_offender, null, 'moderation', 'Предупреждение от модерации', '', v_resp2);
      end if;
    end if;
  end if;

  v_kind := case when p_resolution = 'reject' then 'reject' else 'measures' end;

  -- Маршрутизация текста для автора жалобы (0053): меры → стандартное спасибо,
  -- отклонение → комментарий модератора.
  v_reporter_comment := case
    when p_resolution = 'reject' then coalesce(p_note, '')
    else 'По твоей жалобе приняты меры. Спасибо, что помогаешь делать Kolibel безопаснее!'
  end;

  update public.reports set
    status = case when p_resolution = 'reject' then 'rejected' else 'resolved' end,
    assigned_to = coalesce(assigned_to, auth.uid()),
    moderator_comment = case when coalesce(p_note, '') <> '' then p_note else moderator_comment end
    where id = p_id;

  insert into public.report_actions (report_id, actor_id, action, note)
    values (p_id, auth.uid(), p_resolution, coalesce(p_note, ''));

  if r.reporter_id is not null then
    insert into public.moderation_responses (user_id, report_id, category, kind, resolution, reason, comment)
      values (r.reporter_id, p_id, r.category, 'report_result', v_kind, '', v_reporter_comment)
      returning id into v_resp;
    insert into public.notifications (user_id, actor_id, kind, title, body, entity_id)
      values (r.reporter_id, null, 'moderation', 'Решение по вашей жалобе', '', v_resp);

    select c.id into v_conv
    from public.conversations c
    join public.conversation_participants p
      on p.conversation_id = c.id and p.user_id = r.reporter_id
    where c.kind = 'support'
    limit 1;

    if v_conv is not null then
      update public.messages
        set attach = jsonb_set(
          attach, '{reportStatus}',
          to_jsonb(case when p_resolution = 'reject' then 'rejected' else 'resolved' end))
        where conversation_id = v_conv
          and attach ->> 'reportId' = p_id::text;

      insert into public.messages (conversation_id, sender_id, body, system)
        values (
          v_conv, null,
          'Обновление по жалобе #' || left(p_id::text, 8) || ': ' ||
          case when p_resolution = 'reject' then 'жалоба отклонена.' else 'приняты меры.' end ||
          ' Подробности — в карточке жалобы выше.',
          true
        );
    end if;
  end if;
end; $$;
