-- ============================================================
-- 0034_blocks.sql
-- Чёрный список (блокировки) — раздел «Настройки → Чёрный список».
-- Блокировать можно и пользователя, и компанию (у обоих есть строка в profiles).
-- Поведение (серверный енфорс): нельзя начать новую беседу и нельзя отправить
-- сообщение при блокировке в ЛЮБУЮ сторону. Скрытие из поиска/рекомендаций —
-- клиентское (по множеству заблокированных в обе стороны).
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Таблица блокировок --------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid        not null references public.profiles (id) on delete cascade,
  blocked_id uuid        not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

-- 2) RLS -----------------------------------------------------------------
alter table public.blocks enable row level security;

-- Видны строки, где я блокирующий ИЛИ заблокированный (чтобы знать обе стороны
-- и скрывать друг друга взаимно).
drop policy if exists blocks_select on public.blocks;
create policy blocks_select on public.blocks for select
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

-- Блокировать/разблокировать могу только от своего имени.
drop policy if exists blocks_insert_own on public.blocks;
create policy blocks_insert_own on public.blocks for insert to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists blocks_delete_own on public.blocks;
create policy blocks_delete_own on public.blocks for delete
  using (blocker_id = auth.uid());

-- 3) Хелперы --------------------------------------------------------------
-- Есть ли блокировка между двумя пользователями (в любую сторону)?
create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- Заблокирован ли кто-то из собеседников текущего пользователя в этой беседе?
create or replace function public.is_conversation_blocked(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id <> auth.uid()
      and public.is_blocked_between(auth.uid(), cp.user_id)
  );
$$;

-- 4) Енфорс отправки сообщений: запрет при блокировке --------------------
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
    and not public.is_conversation_blocked(conversation_id)
  );

-- 5) Енфорс старта беседы: запрет при блокировке -------------------------
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
  if public.is_blocked_between(v_me, p_other) then
    raise exception 'Переписка недоступна: пользователь в чёрном списке';
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
