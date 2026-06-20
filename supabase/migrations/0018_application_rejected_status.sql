-- ============================================================
-- 0018_application_rejected_status.sql
-- Добавляет статус 'rejected' (Отказ) в воронку отклика.
-- Нужен для бейджа «Отказ» в разделе «Мои отклики» у соискателя.
-- Проставление отказа со стороны HR — отдельная фича (пока не в UI);
-- здесь только расширяем допустимые значения, чтобы путь чтения был реальным.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

alter table public.vacancy_applications
  drop constraint if exists vacancy_applications_status_check;

alter table public.vacancy_applications
  add constraint vacancy_applications_status_check
    check (status in ('new', 'contacted', 'interview', 'saved', 'rejected'));
