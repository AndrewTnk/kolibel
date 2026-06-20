-- ============================================================
-- 0021_application_offer_status.sql
-- Добавляет стадию 'offer' (Оффер) в воронку отклика.
-- Воронка редизайна: Новые → Связались → Интервью → Оффер (+ Отклонены).
-- Legacy-значение 'saved' оставляем в списке допустимых, чтобы не ломать
-- существующие записи (в новом UI стадия «Сохранённые» не используется).
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

alter table public.vacancy_applications
  drop constraint if exists vacancy_applications_status_check;

alter table public.vacancy_applications
  add constraint vacancy_applications_status_check
    check (status in ('new', 'contacted', 'interview', 'saved', 'offer', 'rejected'));
