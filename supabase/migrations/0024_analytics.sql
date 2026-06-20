-- ============================================================
-- 0024_analytics.sql
-- Аналитика профиля/страницы: события просмотров (профиль и вакансии),
-- агрегирующий RPC за последние 7 дней + дельта к предыдущим 7 дням.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) События просмотров профиля/страницы --------------------------------
--    Профиль и страница компании = одна таблица profiles, поэтому
--    profile_views покрывает оба случая.
create table if not exists public.profile_views (
  id         uuid        primary key default gen_random_uuid(),
  profile_id uuid        not null references public.profiles (id) on delete cascade, -- кого смотрели
  viewer_id  uuid        references public.profiles (id) on delete set null,         -- кто смотрел (null=аноним)
  source     text        not null default 'direct',  -- feed|search|vacancy|network|direct
  created_at timestamptz not null default now()
);
create index if not exists profile_views_profile_idx on public.profile_views (profile_id, created_at desc);

alter table public.profile_views enable row level security;

-- Аналитика приватна: события своего профиля видит только владелец.
drop policy if exists profile_views_select_own on public.profile_views;
create policy profile_views_select_own on public.profile_views for select
  using (auth.uid() = profile_id);
-- INSERT-политики нет умышленно: запись только через security-definer RPC ниже.

-- 2) События просмотров вакансий -----------------------------------------
create table if not exists public.vacancy_views (
  id         uuid        primary key default gen_random_uuid(),
  vacancy_id uuid        not null references public.vacancies (id) on delete cascade,
  company_id uuid,                                                                  -- денормализованный владелец
  viewer_id  uuid        references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists vacancy_views_company_idx on public.vacancy_views (company_id, created_at desc);

alter table public.vacancy_views enable row level security;

drop policy if exists vacancy_views_select_own on public.vacancy_views;
create policy vacancy_views_select_own on public.vacancy_views for select
  using (auth.uid() = company_id);

-- 3) Хелпер «прирост в процентах» ----------------------------------------
create or replace function public.delta_pct(cur numeric, prev numeric)
returns int
language sql
immutable
as $$
  select case
    when prev is null or prev = 0 then case when coalesce(cur, 0) > 0 then 100 else 0 end
    when cur is null then 0
    else round((cur - prev) / prev * 100)::int
  end;
$$;

-- 4) Запись просмотра профиля (дедуп 30 мин, без самопросмотров) ----------
create or replace function public.record_profile_view(p_profile_id uuid, p_source text default 'direct')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_viewer uuid := auth.uid();
begin
  if v_viewer is null then return; end if;          -- приложение auth-gated
  if v_viewer = p_profile_id then return; end if;   -- без самопросмотров
  if exists (
    select 1 from public.profile_views
    where profile_id = p_profile_id and viewer_id = v_viewer
      and created_at > now() - interval '30 minutes'
  ) then return; end if;                            -- дедуп
  insert into public.profile_views (profile_id, viewer_id, source)
  values (p_profile_id, v_viewer, coalesce(nullif(p_source, ''), 'direct'));
end;
$$;

-- 5) Инкремент просмотров вакансии: счётчик + событие (дедуп 30 мин) ------
--    Заменяет версию из 0007 (та только увеличивала счётчик).
create or replace function public.increment_vacancy_views(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_viewer uuid := auth.uid(); v_company uuid;
begin
  select company_id into v_company from public.vacancies where id = p_id;
  if v_company is not null and v_viewer = v_company then return; end if; -- свою не накручиваем
  if v_viewer is not null and exists (
    select 1 from public.vacancy_views
    where vacancy_id = p_id and viewer_id = v_viewer
      and created_at > now() - interval '30 minutes'
  ) then return; end if;                            -- дедуп
  update public.vacancies set views = views + 1 where id = p_id;
  insert into public.vacancy_views (vacancy_id, company_id, viewer_id)
  values (p_id, v_company, v_viewer);
end;
$$;

-- 6) Главный RPC аналитики (доступен только владельцу профиля) ------------
--    Окно: последние 7 дней; дельта — к предыдущим 7 дням.
create or replace function public.get_profile_analytics(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_company boolean;
  w_start timestamptz := now() - interval '7 days';
  w_prev  timestamptz := now() - interval '14 days';
  views_cur int; views_prev int;
  apps_cur  int; apps_prev  int;
  vv_cur    int; vv_prev    int;
  new_conn  int; new_foll   int;
  series    jsonb;
  breakdown jsonb;
  result    jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_profile_id then
    return null;  -- аналитика приватна
  end if;

  select (account_type = 'company') into v_is_company from public.profiles where id = p_profile_id;
  v_is_company := coalesce(v_is_company, false);

  -- Просмотры профиля/страницы
  select count(*) into views_cur from public.profile_views
    where profile_id = p_profile_id and created_at >= w_start;
  select count(*) into views_prev from public.profile_views
    where profile_id = p_profile_id and created_at >= w_prev and created_at < w_start;

  if v_is_company then
    -- Полученные отклики
    select count(*) into apps_cur
      from public.vacancy_applications va
      join public.vacancies v on v.id = va.vacancy_id
      where v.company_id = p_profile_id and va.created_at >= w_start;
    select count(*) into apps_prev
      from public.vacancy_applications va
      join public.vacancies v on v.id = va.vacancy_id
      where v.company_id = p_profile_id and va.created_at >= w_prev and va.created_at < w_start;
    -- Просмотры вакансий
    select count(*) into vv_cur from public.vacancy_views
      where company_id = p_profile_id and created_at >= w_start;
    select count(*) into vv_prev from public.vacancy_views
      where company_id = p_profile_id and created_at >= w_prev and created_at < w_start;
    -- Новые подписчики
    select count(*) into new_foll from public.follows
      where followee_id = p_profile_id and created_at >= w_start;
  else
    -- Отправленные отклики
    select count(*) into apps_cur from public.vacancy_applications
      where applicant_id = p_profile_id and created_at >= w_start;
    select count(*) into apps_prev from public.vacancy_applications
      where applicant_id = p_profile_id and created_at >= w_prev and created_at < w_start;
    -- Новые связи (подписки + подписчики)
    select count(*) into new_conn from public.follows
      where (followee_id = p_profile_id or follower_id = p_profile_id) and created_at >= w_start;
  end if;

  -- Серия просмотров по дням (7 точек, от старого к новому)
  select coalesce(jsonb_agg(c order by d), '[]'::jsonb) into series
  from (
    select gs::date as d,
      (select count(*) from public.profile_views pv
        where pv.profile_id = p_profile_id and pv.created_at::date = gs::date) as c
    from generate_series((now()::date - 6), now()::date, interval '1 day') gs
  ) t;

  -- Разбивка
  if v_is_company then
    -- Откуда приходят (по source)
    select coalesce(jsonb_agg(jsonb_build_object('key', src, 'value', cnt) order by cnt desc), '[]'::jsonb)
      into breakdown
    from (
      select coalesce(nullif(source, ''), 'direct') as src, count(*) cnt
      from public.profile_views
      where profile_id = p_profile_id and created_at >= w_start
      group by 1
    ) s;
  else
    -- Кто смотрит (по типу зрителя)
    select coalesce(jsonb_agg(jsonb_build_object('key', cat, 'value', cnt) order by cnt desc), '[]'::jsonb)
      into breakdown
    from (
      select
        case
          when pr.id is null then 'anon'
          when pr.account_type = 'company' then 'company'
          when pr.job_title ~* '(hr|рекрут|recruit|talent|кадр|персонал)' then 'hr'
          else 'specialist'
        end as cat,
        count(*) cnt
      from public.profile_views pv
      left join public.profiles pr on pr.id = pv.viewer_id
      where pv.profile_id = p_profile_id and pv.created_at >= w_start
      group by 1
    ) s;
  end if;

  result := jsonb_build_object(
    'isCompany', v_is_company,
    'views', jsonb_build_object('count', coalesce(views_cur, 0), 'deltaPct', public.delta_pct(views_cur, views_prev)),
    'applications', jsonb_build_object('count', coalesce(apps_cur, 0), 'deltaPct', public.delta_pct(apps_cur, apps_prev)),
    'series', series,
    'breakdown', breakdown
  );

  if v_is_company then
    result := result
      || jsonb_build_object('vacancyViews', jsonb_build_object('count', coalesce(vv_cur, 0), 'deltaPct', public.delta_pct(vv_cur, vv_prev)))
      || jsonb_build_object('newFollowers', coalesce(new_foll, 0));
  else
    result := result || jsonb_build_object('newConnections', coalesce(new_conn, 0));
  end if;

  return result;
end;
$$;
