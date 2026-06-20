-- ============================================================
-- 0006_vacancies.sql
-- Вакансии: создаются компаниями, видны всем.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

create table if not exists public.vacancies (
  id               uuid primary key default gen_random_uuid(),
  -- Владелец-компания. null = пример без владельца (только для чтения).
  company_id       uuid references auth.users (id) on delete cascade,
  company          text        not null default '',
  company_about    text        not null default '',
  title            text        not null default '',
  city             text        not null default '',
  work_format      text        not null default 'office',
  employment_type  text        not null default 'full',
  experience       text        not null default 'middle',
  salary_from      integer,
  salary_to        integer,
  currency         text        not null default '₽',
  skills           text[]      not null default '{}',
  description      text        not null default '',
  requirements     text[]      not null default '{}',
  conditions       text[]      not null default '{}',
  contact_email    text        not null default '',
  contact_telegram text,
  views            integer     not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists vacancies_created_at_idx on public.vacancies (created_at desc);
create index if not exists vacancies_company_idx on public.vacancies (company_id);

alter table public.vacancies enable row level security;

drop policy if exists vacancies_select_all on public.vacancies;
create policy vacancies_select_all on public.vacancies for select using (true);

drop policy if exists vacancies_insert_own on public.vacancies;
create policy vacancies_insert_own on public.vacancies for insert with check (auth.uid() = company_id);

drop policy if exists vacancies_update_own on public.vacancies;
create policy vacancies_update_own on public.vacancies for update using (auth.uid() = company_id) with check (auth.uid() = company_id);

drop policy if exists vacancies_delete_own on public.vacancies;
create policy vacancies_delete_own on public.vacancies for delete using (auth.uid() = company_id);

-- Примеры вакансий (без владельца) — чтобы публичная страница не была пустой.
-- Вставляем только один раз (по совпадению title+company ничего не проверяем — просто
-- не запускайте этот блок повторно, либо очистите примеры вручную).
insert into public.vacancies
  (company, company_about, title, city, work_format, employment_type, experience, salary_from, salary_to, skills, description, requirements, conditions, contact_email)
values
  ('FinTech Co', 'Финтех-команда, мобильный банк.', 'Frontend-разработчик (React)', 'Москва', 'hybrid', 'full', 'middle', 220000, 320000,
   '{React,TypeScript,Redux}', 'Разработка клиентской части мобильного банка.', '{"Опыт 3+ года","React","TypeScript"}', '{"ДМС","Гибрид"}', 'hr@fintech.co'),
  ('DataForge', 'Big Data и аналитика.', 'Data Analyst', 'Санкт-Петербург', 'remote', 'full', 'junior', 120000, 180000,
   '{SQL,Python,BI}', 'Аналитика продуктовых данных.', '{"SQL","Python"}', '{"Удалёнка","Обучение"}', 'jobs@dataforge.io'),
  ('Nimbus Cloud', 'Облачная инфраструктура.', 'DevOps Engineer', 'Москва', 'office', 'full', 'senior', 300000, 420000,
   '{Kubernetes,Docker,CI/CD}', 'Поддержка и развитие облачной платформы.', '{"K8s","Docker","CI/CD"}', '{"Офис в центре","Техника"}', 'devops@nimbus.cloud'),
  ('Lumen Design', 'Продуктовая дизайн-студия.', 'UX/UI Designer', 'Казань', 'hybrid', 'full', 'middle', 150000, 220000,
   '{Figma,UX,Прототипирование}', 'Дизайн интерфейсов продуктов студии.', '{"Figma","Портфолио"}', '{"Гибкий график"}', 'design@lumen.studio');
