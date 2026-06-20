-- ============================================================
-- 0023_company_sections.sql
-- Доп. секции бренд-страницы компании (редизайн «Профиль компании»):
--   tagline        — короткий слоган под именем в hero
--   directions     — «Чем занимаемся» (jsonb [{id,icon,title,desc}])
--   culture_values — «Ценности и культура» (jsonb [{id,title,desc}])
--   gallery        — «Жизнь в компании» (jsonb [{id,url}])
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

alter table public.companies
  add column if not exists tagline        text,
  add column if not exists directions     jsonb not null default '[]'::jsonb,
  add column if not exists culture_values  jsonb not null default '[]'::jsonb,
  add column if not exists gallery        jsonb not null default '[]'::jsonb;
