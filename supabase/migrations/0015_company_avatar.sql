-- ============================================================
-- 0015_company_avatar.sql
-- Фото профиля компании (большая картинка в шапке) — отдельно от
-- логотипа-бейджа (companies.logo_url). companies.avatar_url.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

alter table public.companies
  add column if not exists avatar_url text;
