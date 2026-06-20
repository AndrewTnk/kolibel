-- ============================================================
-- 0001_profiles.sql
-- Таблица профилей пользователей (1:1 с auth.users).
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Таблица профилей -----------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text        not null default '',
  job_title     text        not null default '',
  headline      text        not null default '',
  location      text        not null default '',
  country       text,
  work_format   text        not null default '',
  available     boolean     not null default true,
  -- Статус работы целиком: { kind, company, companyLogo }
  job_status    jsonb       not null default '{"kind":"seeking"}'::jsonb,
  avatar_url    text,
  banner_url    text,
  about         text        not null default '',
  skills        text[]      not null default '{}',
  -- Сложные секции резюме храним как JSON (для MVP это проще, чем отдельные таблицы)
  highlights    jsonb       not null default '[]'::jsonb,
  experience    jsonb       not null default '[]'::jsonb,
  education      jsonb       not null default '[]'::jsonb,
  languages     jsonb       not null default '[]'::jsonb,
  contacts      jsonb       not null default '[]'::jsonb,
  -- Тип аккаунта (как в Redux accountSlice)
  account_type  text        not null default 'user' check (account_type in ('user','company')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Профиль пользователя, привязан к auth.users';

-- 2) Row Level Security ---------------------------------------
alter table public.profiles enable row level security;

-- Профили видны всем (соцсеть: публичные профили)
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- Изменять/создавать можно только свой профиль
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3) Авто-создание профиля при регистрации --------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Авто-обновление updated_at -------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 5) Профили для уже существующих пользователей ---------------
-- (на случай, если кто-то зарегистрировался до создания таблицы)
insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
on conflict (id) do nothing;
