-- ============================================================
-- 0025_vacancy_experience_cleanup.sql
-- Требуемый опыт вакансии — в годах (диапазон от/до). Грейд (Junior/Senior…)
-- полностью убирается: колонка experience удаляется, фильтр по уровню снят.
-- ⚠️ Колонки experience_from/to добавляются здесь же, т.к. миграция 0017
-- по факту НЕ была применена (в БД их не было). Эта миграция её замещает.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

alter table public.vacancies
  add column if not exists experience_from integer,
  add column if not exists experience_to   integer;

-- Грейд больше не используется ни в UI, ни в коде.
alter table public.vacancies drop column if exists experience;
