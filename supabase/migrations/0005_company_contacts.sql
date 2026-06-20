-- ============================================================
-- 0005_company_contacts.sql
-- Контакты компании (founder/hr) — хранятся в companies.contacts (jsonb).
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

alter table public.companies
  add column if not exists contacts jsonb not null default '[]'::jsonb;
