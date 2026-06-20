-- ============================================================
-- 0011_follows.sql
-- Подписки (follows): кто на кого подписан. Цель — любой профиль
-- (и пользователь, и компания: компания = profiles с account_type='company').
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

create table if not exists public.follows (
  follower_id uuid        not null references public.profiles (id) on delete cascade,
  followee_id uuid        not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

-- Граф подписок публичный (счётчики, «кто на кого подписан»).
drop policy if exists follows_select_all on public.follows;
create policy follows_select_all on public.follows for select using (true);

-- Подписываться можно только от своего имени.
drop policy if exists follows_insert_own on public.follows;
create policy follows_insert_own on public.follows for insert to authenticated
  with check (follower_id = auth.uid());

-- Отписываться — только свою подписку.
drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own on public.follows for delete to authenticated
  using (follower_id = auth.uid());
