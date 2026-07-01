-- ============================================================
-- 0048_report_short_id.sql
-- Номер жалобы у пользователя = как в админ-панели: «#» + первые 8 символов UUID
-- (в админке — `Жалоба #{id.slice(0,8)}`). Раньше карточка/превью/бамп показывали
-- «№{seq}» — не совпадало. Переопределяет submit_report (0046) и admin_resolve_report
-- (0047), меняя только текст номера. Колонка reports.seq остаётся (не используется).
-- Применять ПОСЛЕ 0047. Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Карточка жалобы: заголовок «Жалоба #xxxxxxxx» -------------------------
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
  if p_target_type not in ('user', 'company', 'post', 'comment', 'vacancy') then
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

-- 2) Бамп при решении: «Обновление по жалобе #xxxxxxxx» -------------------
create or replace function public.admin_resolve_report(
  p_id uuid, p_resolution text, p_note text default '', p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.reports%rowtype;
  v_kind text;
  v_resp uuid;
  v_conv uuid;
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

  update public.reports set
    status = case when p_resolution = 'reject' then 'rejected' else 'resolved' end,
    assigned_to = coalesce(assigned_to, auth.uid()),
    moderator_comment = case when coalesce(p_note, '') <> '' then p_note else moderator_comment end
    where id = p_id;

  insert into public.report_actions (report_id, actor_id, action, note)
    values (p_id, auth.uid(), p_resolution, coalesce(p_note, ''));

  if r.reporter_id is not null then
    insert into public.moderation_responses (user_id, report_id, category, kind, resolution, reason, comment)
      values (r.reporter_id, p_id, r.category, 'report_result', v_kind, coalesce(p_reason, ''), coalesce(p_note, ''))
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
