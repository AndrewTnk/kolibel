-- ============================================================
-- 0017_vacancy_experience_years.sql
-- Требуемый опыт вакансии в годах (диапазон от/до) вместо грейда.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

alter table public.vacancies
  add column if not exists experience_from integer,
  add column if not exists experience_to   integer;
