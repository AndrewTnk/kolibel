-- ============================================================
-- 0053: Комментарий модератора — только своему адресату.
--
-- Было (0039/0047/0048): одно поле p_note попадало в moderation_responses
-- ОБОИХ сторон — автор жалобы видел текст, адресованный нарушителю
-- (причину блокировки/удаления). Решение владельца (вариант А, 2026-07-03) —
-- маршрутизация по типу решения:
--   • «Принять меры» (measures): причина+комментарий уходят ТОЛЬКО нарушителю
--     (внутри admin_remove_content / admin_set_account_status — без изменений);
--     автор жалобы получает стандартное «По твоей жалобе приняты меры…»
--     без причины и комментария.
--   • «Отклонить» (reject): комментарий уходит ТОЛЬКО автору жалобы
--     (объяснение, почему отклонили); нарушитель, как и раньше, ничего
--     не получает.
-- reports.moderator_comment и report_actions.note по-прежнему хранят p_note
-- (внутренняя история для модераторов).
--
-- Переопределяет admin_resolve_report из 0048 (меняется только insert
-- в moderation_responses автора жалобы). Применять ПОСЛЕ 0048.
-- Supabase Dashboard → SQL Editor → вставить целиком → Run. Идемпотентно.
-- ============================================================

create or replace function public.admin_resolve_report(
  p_id uuid, p_resolution text, p_note text default '', p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.reports%rowtype;
  v_kind text;
  v_resp uuid;
  v_conv uuid;
  v_reporter_comment text;
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
    end if;
  end if;

  v_kind := case when p_resolution = 'reject' then 'reject' else 'measures' end;

  -- Маршрутизация текста для автора жалобы: меры → стандартное спасибо
  -- (комментарий модератора адресован нарушителю); отклонение → комментарий
  -- модератора (объяснение автору жалобы).
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
