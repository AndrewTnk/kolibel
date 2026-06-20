-- ============================================================
-- 0004_companies.sql
-- Профиль компании (1:1 с аккаунтом-компанией) + автосоздание при регистрации.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Таблица компаний -----------------------------------------
create table if not exists public.companies (
  id                uuid primary key references auth.users (id) on delete cascade,
  name              text        not null default '',
  logo_url          text,
  banner_url        text,
  industry          text        not null default '',
  location          text        not null default '',
  country           text,
  about             text        not null default '',
  website           text        not null default '',
  size              text        not null default '',
  headquarters      text        not null default '',
  connected_members text        not null default '',
  verified_date     text,
  specialties       text[]      not null default '{}',
  products          jsonb       not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.companies is 'Профиль компании, привязан к аккаунту-компании';

-- 2) RLS -------------------------------------------------------
alter table public.companies enable row level security;

drop policy if exists companies_select_all on public.companies;
create policy companies_select_all on public.companies for select using (true);

drop policy if exists companies_insert_own on public.companies;
create policy companies_insert_own on public.companies for insert with check (auth.uid() = id);

drop policy if exists companies_update_own on public.companies;
create policy companies_update_own on public.companies for update using (auth.uid() = id) with check (auth.uid() = id);

-- 3) updated_at ------------------------------------------------
drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- 4) Триггер регистрации: профиль + (для компаний) запись компании
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type text := case
    when new.raw_user_meta_data ->> 'account_type' = 'company' then 'company'
    else 'user'
  end;
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
begin
  insert into public.profiles (id, full_name, account_type)
  values (new.id, v_name, v_account_type)
  on conflict (id) do nothing;

  if v_account_type = 'company' then
    insert into public.companies (id, name)
    values (new.id, v_name)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

-- 5) Добор компаний для уже зарегистрированных company-аккаунтов
insert into public.companies (id, name)
select p.id, p.full_name
from public.profiles p
where p.account_type = 'company'
on conflict (id) do nothing;
