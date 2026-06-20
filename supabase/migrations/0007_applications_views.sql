-- ============================================================
-- 0007_applications_views.sql
-- Отклики на вакансии + счётчик просмотров.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Отклики ---------------------------------------------------
create table if not exists public.vacancy_applications (
  id              uuid primary key default gen_random_uuid(),
  vacancy_id      uuid        not null references public.vacancies (id) on delete cascade,
  applicant_id    uuid        not null references public.profiles (id) on delete cascade,
  applicant_name  text        not null default '',
  applicant_title text        not null default '',
  applicant_email text        not null default '',
  note            text,
  created_at      timestamptz not null default now(),
  unique (vacancy_id, applicant_id)
);
create index if not exists applications_vacancy_idx on public.vacancy_applications (vacancy_id);
create index if not exists applications_applicant_idx on public.vacancy_applications (applicant_id);

alter table public.vacancy_applications enable row level security;

-- Видят: сам кандидат и владелец вакансии
drop policy if exists applications_select on public.vacancy_applications;
create policy applications_select on public.vacancy_applications for select
  using (
    auth.uid() = applicant_id
    or auth.uid() = (select v.company_id from public.vacancies v where v.id = vacancy_id)
  );

-- Откликается только сам кандидат
drop policy if exists applications_insert_own on public.vacancy_applications;
create policy applications_insert_own on public.vacancy_applications for insert
  with check (auth.uid() = applicant_id);

-- Отозвать отклик может сам кандидат
drop policy if exists applications_delete_own on public.vacancy_applications;
create policy applications_delete_own on public.vacancy_applications for delete
  using (auth.uid() = applicant_id);

-- 2) Инкремент просмотров (security definer — обходит RLS на update) ---
create or replace function public.increment_vacancy_views(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.vacancies set views = views + 1 where id = p_id;
$$;
