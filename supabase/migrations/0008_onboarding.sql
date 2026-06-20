-- ============================================================
-- 0008_onboarding.sql
-- Флаг прохождения онбординга. Новые аккаунты проходят мастер заполнения профиля.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

alter table public.profiles
  add column if not exists onboarded boolean not null default false;

-- Уже существующие аккаунты считаем прошедшими онбординг (не дёргаем их).
update public.profiles set onboarded = true where onboarded = false;
