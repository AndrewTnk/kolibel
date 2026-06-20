-- ============================================================
-- 0013_application_status.sql
-- Статус отклика (мини-ATS воронка). Владелец вакансии двигает кандидата по стадиям.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

alter table public.vacancy_applications
  add column if not exists status text not null default 'new'
    check (status in ('new', 'contacted', 'interview', 'saved'));

-- Владелец вакансии может менять статус откликов на свою вакансию.
drop policy if exists applications_update_owner on public.vacancy_applications;
create policy applications_update_owner on public.vacancy_applications for update
  using (
    auth.uid() = (select v.company_id from public.vacancies v where v.id = vacancy_id)
  )
  with check (
    auth.uid() = (select v.company_id from public.vacancies v where v.id = vacancy_id)
  );
