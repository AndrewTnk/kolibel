-- ============================================================
-- 0022_vacancy_folders.sql
-- Папки вакансий (HR группирует свои вакансии: «Срочный найм», «План на Q3»…).
-- vacancy_folders — папка (имя + цвет), принадлежит компании-владельцу.
-- vacancy_folder_items — связь папка↔вакансия (многие-ко-многим).
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

create table if not exists public.vacancy_folders (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid        not null references auth.users (id) on delete cascade,
  name        text        not null default '',
  color       text        not null default '#ff7f50',
  created_at  timestamptz not null default now()
);
create index if not exists vacancy_folders_company_idx on public.vacancy_folders (company_id);

create table if not exists public.vacancy_folder_items (
  folder_id   uuid not null references public.vacancy_folders (id) on delete cascade,
  vacancy_id  uuid not null references public.vacancies (id) on delete cascade,
  primary key (folder_id, vacancy_id)
);
create index if not exists vacancy_folder_items_vacancy_idx on public.vacancy_folder_items (vacancy_id);

alter table public.vacancy_folders enable row level security;
alter table public.vacancy_folder_items enable row level security;

-- Папки: видит и управляет только владелец (компания).
drop policy if exists vacancy_folders_all_own on public.vacancy_folders;
create policy vacancy_folders_all_own on public.vacancy_folders for all
  using (auth.uid() = company_id)
  with check (auth.uid() = company_id);

-- Элементы папки: доступ по владельцу самой папки.
drop policy if exists vacancy_folder_items_all_own on public.vacancy_folder_items;
create policy vacancy_folder_items_all_own on public.vacancy_folder_items for all
  using (
    auth.uid() = (select f.company_id from public.vacancy_folders f where f.id = folder_id)
  )
  with check (
    auth.uid() = (select f.company_id from public.vacancy_folders f where f.id = folder_id)
  );
