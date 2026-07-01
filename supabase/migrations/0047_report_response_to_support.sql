-- ============================================================
-- 0047_report_response_to_support.sql
-- Решение модератора по жалобе теперь дублируется в чат «Поддержка Kolibel»:
--   • обновляем статус карточки жалобы (reportStatus в attach сообщения);
--   • постим системный бамп — беседа поддержки всплывает как непрочитанная,
--     а сам ответ (вердикт/причина/комментарий) виден в раскрытой карточке
--     через get_my_report (moderation_responses).
-- Существующие уведомления (kind='moderation') и модалка не трогаются — это
-- второй, группирующий канал. Переопределяет admin_resolve_report из 0039.
-- Применять ПОСЛЕ 0046. Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

create or replace function public.admin_resolve_report(
  p_id uuid, p_resolution text, p_note text default '', p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.reports%rowtype;
  v_kind text;      -- ответ автору жалобы: measures|reject
  v_resp uuid;
  v_conv uuid;      -- беседа поддержки автора жалобы
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

    -- Дублируем в чат «Поддержка Kolibel»: свежий статус карточки + системный бамп.
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
          'Обновление по жалобе №' || coalesce(r.seq::text, '') || ': ' ||
          case when p_resolution = 'reject' then 'жалоба отклонена.' else 'приняты меры.' end ||
          ' Подробности — в карточке жалобы выше.',
          true
        );
    end if;
  end if;
end; $$;
