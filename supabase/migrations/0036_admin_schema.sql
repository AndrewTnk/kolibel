-- ============================================================
-- 0036_admin_schema.sql
-- Админ-панель (MVP): роли (admin/moderator), софт-статусы модерации,
-- таблицы жалоб. RPC вынесены в 0037_admin_rpcs.sql.
-- Применить ПЕРВЫМ (до 0037): Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Роли админ-панели --------------------------------------------------
--    Отдельная таблица (НЕ поле в profiles): profiles редактирует владелец,
--    поэтому роль там можно было бы накрутить себе. Здесь писать может только admin.
create table if not exists public.admin_roles (
  user_id    uuid        primary key references public.profiles (id) on delete cascade,
  role       text        not null check (role in ('admin', 'moderator')),
  granted_by uuid        references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.admin_roles is 'Роли админ-панели: admin (фаундер) / moderator (назначаемый)';

alter table public.admin_roles enable row level security;

-- Хелперы ролей. security definer → читают таблицу в обход RLS (нет рекурсии политик).
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Сотрудник админки = admin ИЛИ moderator.
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admin_roles where user_id = auth.uid());
$$;

-- Свою строку видит каждый (фронт понимает, есть ли роль); все строки — только admin.
drop policy if exists admin_roles_select on public.admin_roles;
create policy admin_roles_select on public.admin_roles for select
  using (user_id = auth.uid() or public.is_admin());

-- Любые изменения ролей — только admin (назначение/снятие модераторов).
drop policy if exists admin_roles_insert on public.admin_roles;
create policy admin_roles_insert on public.admin_roles for insert
  with check (public.is_admin());

drop policy if exists admin_roles_update on public.admin_roles;
create policy admin_roles_update on public.admin_roles for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_roles_delete on public.admin_roles;
create policy admin_roles_delete on public.admin_roles for delete
  using (public.is_admin());

-- ⚠️ BOOTSTRAP первого админа (фаундера). Раскомментируй и подставь свой uid,
--    либо выполни отдельным запросом после применения миграции:
--    insert into public.admin_roles (user_id, role) values ('<ТВОЙ-UID>', 'admin')
--      on conflict (user_id) do update set role = 'admin';
--    UID можно взять: select id from auth.users where email = 'tonkachiov@gmail.com';

-- 2) Софт-статусы модерации (без жёсткого удаления из auth) --------------
-- Аккаунт (покрывает И юзера, И компанию — у обоих строка в profiles).
alter table public.profiles
  add column if not exists status text not null default 'active'
    check (status in ('active', 'blocked', 'deleted'));

-- Модерация вакансии — отдельно от владельческого lifecycle-статуса (active/paused/draft/closed).
alter table public.vacancies
  add column if not exists moderation text not null default 'visible'
    check (moderation in ('visible', 'hidden', 'removed'));

-- Софт-удаление постов/комментариев.
alter table public.posts          add column if not exists removed_at timestamptz;
alter table public.post_comments  add column if not exists removed_at timestamptz;

-- 3) Прячем модерированный контент из публичных выборок (staff видят всё) -
drop policy if exists posts_select_all on public.posts;
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select
  using (removed_at is null or public.is_staff());

drop policy if exists post_comments_select_all on public.post_comments;
drop policy if exists post_comments_select on public.post_comments;
create policy post_comments_select on public.post_comments for select
  using (removed_at is null or public.is_staff());

-- Вакансии: прежнее правило (черновик — только владельцу) + скрытые/удалённые
-- модерацией не видны публично (видит владелец и staff).
drop policy if exists vacancies_select_all on public.vacancies;
create policy vacancies_select_all on public.vacancies for select
  using (
    (coalesce(status, 'active') <> 'draft' or auth.uid() = company_id)
    and (coalesce(moderation, 'visible') = 'visible' or auth.uid() = company_id or public.is_staff())
  );

-- 4) Жалобы --------------------------------------------------------------
create table if not exists public.reports (
  id                uuid        primary key default gen_random_uuid(),
  reporter_id       uuid        references public.profiles (id) on delete set null,  -- кто пожаловался
  target_type       text        not null check (target_type in ('user', 'company', 'post', 'comment', 'vacancy')),
  target_id         uuid        not null,                                            -- на что/на кого
  category          text        not null default '',                                -- "Оскорбления и травля" и т.п.
  description       text        not null default '',                                -- текст жалобы
  priority          text        not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status            text        not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'rejected')),
  assigned_to       uuid        references public.profiles (id) on delete set null,  -- назначенный модератор
  moderator_comment text        not null default '',
  evidence          jsonb       not null default '[]'::jsonb,                        -- скриншоты-доказательства (на будущее)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists reports_status_idx   on public.reports (status, created_at desc);
create index if not exists reports_priority_idx on public.reports (priority);
create index if not exists reports_target_idx   on public.reports (target_type, target_id);

comment on table public.reports is 'Жалобы пользователей на контент/аккаунты (раздел админки)';

alter table public.reports enable row level security;

-- Подать жалобу может любой авторизованный (от своего имени). Видят/меняют — только staff.
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists reports_select_staff on public.reports;
create policy reports_select_staff on public.reports for select
  using (public.is_staff());

drop policy if exists reports_update_staff on public.reports;
create policy reports_update_staff on public.reports for update
  using (public.is_staff()) with check (public.is_staff());

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- История действий по жалобе (таймлайн в детальной панели).
create table if not exists public.report_actions (
  id         uuid        primary key default gen_random_uuid(),
  report_id  uuid        not null references public.reports (id) on delete cascade,
  actor_id   uuid        references public.profiles (id) on delete set null,
  action     text        not null,             -- 'created' | 'assigned' | 'status' | 'measures' | 'warn' | 'block' | 'reject' | 'comment'
  note       text        not null default '',
  created_at timestamptz not null default now()
);
create index if not exists report_actions_report_idx on public.report_actions (report_id, created_at);

alter table public.report_actions enable row level security;

drop policy if exists report_actions_select_staff on public.report_actions;
create policy report_actions_select_staff on public.report_actions for select
  using (public.is_staff());
-- INSERT только через security-definer RPC (0037) — прямой политики нет.
