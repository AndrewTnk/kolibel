-- ============================================================
-- 0010_chat.sql
-- Личные переписки 1:1 (conversations + participants + messages) с RLS и Realtime.
-- Модель: беседа создаётся через RPC start_conversation(other_user) — она же
-- находит уже существующую 1:1 между этими двумя, чтобы не плодить дубликаты.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Таблицы ---------------------------------------------------
create table if not exists public.conversations (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid        not null references public.conversations (id) on delete cascade,
  user_id         uuid        not null references public.profiles (id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conv_participants_user_idx
  on public.conversation_participants (user_id);

create table if not exists public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations (id) on delete cascade,
  sender_id       uuid        not null references public.profiles (id) on delete cascade,
  body            text        not null,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conv_idx
  on public.messages (conversation_id, created_at);

-- 2) Хелпер «я участник беседы?» (security definer — чтобы политики
--    на conversation_participants не уходили в рекурсию при self-reference).
create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id
      and user_id = auth.uid()
  );
$$;

-- 3) RLS -------------------------------------------------------
alter table public.conversations            enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                 enable row level security;

-- conversations: видны только участникам. Прямую вставку/изменение не открываем —
-- создание идёт через RPC (security definer обходит RLS).
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations for select
  using (public.is_conversation_participant(id));

-- participants: участник видит все строки своих бесед (в т.ч. собеседника).
drop policy if exists participants_select on public.conversation_participants;
create policy participants_select on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id));

-- Свою отметку прочтения (last_read_at) можно обновлять.
drop policy if exists participants_update_own on public.conversation_participants;
create policy participants_update_own on public.conversation_participants for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- messages: видят участники беседы.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
  using (public.is_conversation_participant(conversation_id));

-- Отправлять может только участник и только от своего имени.
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

-- 4) last_message_at: бампим при каждом новом сообщении -----------
create or replace function public.bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_bump on public.messages;
create trigger messages_bump
  after insert on public.messages
  for each row execute function public.bump_conversation();

-- 5) RPC: найти или создать 1:1 беседу с другим пользователем ------
create or replace function public.start_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me   uuid := auth.uid();
  v_conv uuid;
begin
  if v_me is null then
    raise exception 'Нет активной сессии';
  end if;
  if p_other is null or p_other = v_me then
    raise exception 'Некорректный получатель';
  end if;

  -- уже есть ровно-двойственная беседа между этими двумя?
  select c.id into v_conv
  from public.conversations c
  where exists (
          select 1 from public.conversation_participants
          where conversation_id = c.id and user_id = v_me)
    and exists (
          select 1 from public.conversation_participants
          where conversation_id = c.id and user_id = p_other)
    and (select count(*) from public.conversation_participants
          where conversation_id = c.id) = 2
  limit 1;

  if v_conv is not null then
    return v_conv;
  end if;

  insert into public.conversations default values returning id into v_conv;
  insert into public.conversation_participants (conversation_id, user_id)
    values (v_conv, v_me), (v_conv, p_other);
  return v_conv;
end;
$$;

-- 6) Realtime: транслировать новые сообщения подписчикам -----------
-- (Realtime уважает RLS: клиент получит только сообщения своих бесед.)
alter publication supabase_realtime add table public.messages;
