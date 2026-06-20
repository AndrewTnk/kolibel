-- ============================================================
-- 0020_vacancy_status.sql
-- Статус вакансии для раздела «Мои вакансии» (ATS): активна / на паузе /
-- черновик / закрыта. Черновики видны только владельцу (RLS).
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

alter table public.vacancies
  add column if not exists status text not null default 'active'
    check (status in ('active', 'paused', 'draft', 'closed'));

create index if not exists vacancies_status_idx on public.vacancies (status);

-- Черновики не показываем публично — только владельцу.
-- (Остальные статусы видны всем, как и раньше.)
drop policy if exists vacancies_select_all on public.vacancies;
create policy vacancies_select_all on public.vacancies for select
  using (coalesce(status, 'active') <> 'draft' or auth.uid() = company_id);
