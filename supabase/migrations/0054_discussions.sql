-- ============================================================
-- 0054: Обращения в поддержку («Обсуждения») — тикеты с перепиской.
--
-- Пользователь создаёт обращение (категория/тема/текст) и переписывается
-- с поддержкой; админ/модератор отвечает из админки (раздел «Обсуждения»).
-- Ответы для пользователя анонимны («Поддержка Kolibel»), кто именно ответил —
-- хранится в staff_id и видно только в админке. Без realtime: пользователь
-- узнаёт об ответе из уведомления (kind 'support').
--
-- Ключевой кейс — оспорить блокировку: RLS намеренно НЕ фильтрует
-- заблокированных (is_account_blocked не используется), сессия у них валидна.
--
-- Применить: Supabase Dashboard → SQL Editor → вставить целиком → Run. Идемпотентно.
-- ============================================================

-- 1) Таблицы ---------------------------------------------------------------

create table if not exists public.discussions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  category        text not null default 'question' check (category in ('question', 'problem', 'appeal', 'other')),
  subject         text not null default '',
  status          text not null default 'open' check (status in ('open', 'closed')),
  -- Денормализация для корзины «ждут ответа»: от кого последнее сообщение.
  last_sender     text not null default 'user' check (last_sender in ('user', 'staff')),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists discussions_user_idx  on public.discussions (user_id, last_message_at desc);
create index if not exists discussions_admin_idx on public.discussions (status, last_message_at desc);

create table if not exists public.discussion_messages (
  id            uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  sender_kind   text not null check (sender_kind in ('user', 'staff')),
  -- Кто из staff ответил — только для админки, пользователю не отдаётся.
  staff_id      uuid references public.profiles(id) on delete set null,
  body          text not null,
  created_at    timestamptz not null default now()
);

create index if not exists discussion_messages_idx on public.discussion_messages (discussion_id, created_at);

alter table public.discussions enable row level security;
alter table public.discussion_messages enable row level security;

-- 2) RLS -------------------------------------------------------------------
-- Пользователь видит/создаёт свои обращения; писать может только в своё
-- ОТКРЫТОЕ обращение и только от своего имени. Staff читает всё (для админки);
-- отвечает НЕ прямым insert'ом, а через definer-RPC admin_reply_discussion.

drop policy if exists discussions_select on public.discussions;
create policy discussions_select on public.discussions for select
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists discussions_insert on public.discussions;
create policy discussions_insert on public.discussions for insert
  with check (user_id = auth.uid());

drop policy if exists dmsg_select on public.discussion_messages;
create policy dmsg_select on public.discussion_messages for select
  using (exists (
    select 1 from public.discussions d
    where d.id = discussion_id and (d.user_id = auth.uid() or public.is_staff())
  ));

drop policy if exists dmsg_insert_user on public.discussion_messages;
create policy dmsg_insert_user on public.discussion_messages for insert
  with check (
    sender_kind = 'user' and staff_id is null
    and exists (
      select 1 from public.discussions d
      where d.id = discussion_id and d.user_id = auth.uid() and d.status = 'open'
    )
  );

-- 3) Триггер: сообщение → last_message_at / last_sender ---------------------

create or replace function public.discussion_touch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.discussions
     set last_message_at = new.created_at,
         last_sender     = new.sender_kind
   where id = new.discussion_id;
  return new;
end; $$;

drop trigger if exists discussion_touch on public.discussion_messages;
create trigger discussion_touch after insert on public.discussion_messages
  for each row execute function public.discussion_touch();

-- 4) Уведомления: новый kind 'support' --------------------------------------

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('application', 'message', 'follow', 'vacancy', 'system',
                  'like', 'comment', 'comment_like', 'reply', 'moderation', 'support'));

-- 5) RPC: список обращений для админки --------------------------------------

create or replace function public.get_admin_discussions(
  p_bucket text default '', p_search text default '', p_limit int default 12, p_offset int default 0)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare
  v_rows jsonb; v_total int; v_counts jsonb;
  -- Поиск по номеру: «#» и пробелы отбрасываются (как в get_admin_reports, 0052).
  v_id_q text := replace(lower(trim(coalesce(p_search, ''))), '#', '');
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  select jsonb_build_object(
    'all',     count(*),
    'waiting', count(*) filter (where status = 'open' and last_sender = 'user'),
    'open',    count(*) filter (where status = 'open'),
    'closed',  count(*) filter (where status = 'closed')
  ) into v_counts from public.discussions;

  select count(*) into v_total
  from public.discussions d
  where (p_bucket = '' or
         (p_bucket = 'waiting' and d.status = 'open' and d.last_sender = 'user') or
         (p_bucket = 'open'    and d.status = 'open') or
         (p_bucket = 'closed'  and d.status = 'closed'))
    and (coalesce(p_search, '') = ''
         or d.subject ilike '%' || p_search || '%'
         or exists (select 1 from public.profiles pr where pr.id = d.user_id and pr.full_name ilike '%' || p_search || '%')
         or exists (select 1 from public.companies c  where c.id  = d.user_id and c.name      ilike '%' || p_search || '%')
         or (v_id_q <> '' and d.id::text like v_id_q || '%'));

  select coalesce(jsonb_agg(x order by last_message_at desc), '[]'::jsonb) into v_rows from (
    select d.last_message_at, jsonb_build_object(
      'id', d.id,
      'user', public.admin_actor(d.user_id),
      'category', d.category,
      'subject', d.subject,
      'status', d.status,
      'waiting', (d.status = 'open' and d.last_sender = 'user'),
      'createdAt', d.created_at,
      'lastMessageAt', d.last_message_at,
      'lastPreview', (select left(m.body, 120) from public.discussion_messages m
                      where m.discussion_id = d.id order by m.created_at desc limit 1)
    ) x
    from public.discussions d
    where (p_bucket = '' or
           (p_bucket = 'waiting' and d.status = 'open' and d.last_sender = 'user') or
           (p_bucket = 'open'    and d.status = 'open') or
           (p_bucket = 'closed'  and d.status = 'closed'))
      and (coalesce(p_search, '') = ''
           or d.subject ilike '%' || p_search || '%'
           or exists (select 1 from public.profiles pr where pr.id = d.user_id and pr.full_name ilike '%' || p_search || '%')
           or exists (select 1 from public.companies c  where c.id  = d.user_id and c.name      ilike '%' || p_search || '%')
           or (v_id_q <> '' and d.id::text like v_id_q || '%'))
    order by d.last_message_at desc limit p_limit offset p_offset
  ) s;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'counts', v_counts);
end; $$;

-- 6) RPC: обращение детально (с перепиской) ----------------------------------

create or replace function public.get_admin_discussion(p_id uuid)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare d public.discussions%rowtype; v_msgs jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into d from public.discussions where id = p_id;
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'kind', m.sender_kind,
    'body', m.body,
    'createdAt', m.created_at,
    'staff', case when m.staff_id is null then null else public.admin_actor(m.staff_id) end
  ) order by m.created_at), '[]'::jsonb) into v_msgs
  from public.discussion_messages m where m.discussion_id = p_id;

  return jsonb_build_object(
    'id', d.id, 'user', public.admin_actor(d.user_id), 'category', d.category,
    'subject', d.subject, 'status', d.status, 'createdAt', d.created_at, 'messages', v_msgs);
end; $$;

-- 7) RPC: ответ поддержки ----------------------------------------------------

create or replace function public.admin_reply_discussion(p_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare d public.discussions%rowtype;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'Пустой ответ'; end if;
  select * into d from public.discussions where id = p_id;
  if not found then raise exception 'discussion not found'; end if;

  insert into public.discussion_messages (discussion_id, sender_kind, staff_id, body)
    values (p_id, 'staff', auth.uid(), trim(p_body));

  -- Ответ в закрытое обращение переоткрывает его (пользователь сможет ответить).
  if d.status = 'closed' then
    update public.discussions set status = 'open' where id = p_id;
  end if;

  insert into public.notifications (user_id, actor_id, kind, title, body, entity_id)
    values (d.user_id, null, 'support', 'Поддержка Kolibel', 'Новый ответ на твоё обращение', p_id);
end; $$;

-- 8) RPC: смена статуса (закрыть / открыть заново) ---------------------------

create or replace function public.admin_set_discussion_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare d public.discussions%rowtype;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('open', 'closed') then raise exception 'bad status'; end if;
  select * into d from public.discussions where id = p_id;
  if not found then raise exception 'discussion not found'; end if;

  update public.discussions set status = p_status where id = p_id;

  if p_status = 'closed' and d.status <> 'closed' then
    insert into public.notifications (user_id, actor_id, kind, title, body, entity_id)
      values (d.user_id, null, 'support', 'Поддержка Kolibel', 'Обращение закрыто', p_id);
  end if;
end; $$;
