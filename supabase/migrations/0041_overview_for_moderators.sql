-- ============================================================
-- 0041_overview_for_moderators.sql
-- Возвращаем дашборд («Главная») модераторам: get_admin_overview теперь
-- проверяет is_staff() вместо is_admin(). Аналитика платформы
-- (get_admin_analytics) остаётся только админу.
-- Применять ПОСЛЕ 0040. Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

create or replace function public.get_admin_overview()
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare
  v_growth jsonb; v_reg jsonb; v_latest_users jsonb; v_latest_companies jsonb;
begin
  -- Дашборд доступен всему staff (admin + moderator).
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  -- Рост пользователей (накопительно, 30 дней)
  select coalesce(jsonb_agg(jsonb_build_object('d', d, 'total', total) order by d), '[]'::jsonb) into v_growth
  from (
    select gs::date d,
      (select count(*) from public.profiles where account_type = 'user' and created_at::date <= gs::date) total
    from generate_series(now()::date - 29, now()::date, interval '1 day') gs
  ) t;

  -- Регистрации/активность по дням (30 дней).
  select coalesce(jsonb_agg(jsonb_build_object('d', d, 'new', n, 'active', a) order by d), '[]'::jsonb) into v_reg
  from (
    select gs::date d,
      (select count(*) from public.profiles where account_type = 'user' and created_at::date = gs::date) n,
      (select count(*) from public.profiles where last_seen_at::date = gs::date) a
    from generate_series(now()::date - 29, now()::date, interval '1 day') gs
  ) t;

  -- Последние регистрации (5)
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_latest_users from (
    select jsonb_build_object('id', p.id, 'name', coalesce(nullif(p.full_name, ''), 'Без имени'),
      'email', au.email, 'avatar', p.avatar_url, 'createdAt', p.created_at) x
    from public.profiles p join auth.users au on au.id = p.id
    where p.account_type = 'user'
    order by p.created_at desc limit 5
  ) s;

  -- Последние компании (5)
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_latest_companies from (
    select jsonb_build_object('id', c.id, 'name', coalesce(nullif(c.name, ''), 'Без названия'),
      'logo', coalesce(c.logo_url, c.avatar_url), 'website', nullif(c.website, ''), 'createdAt', c.created_at) x
    from public.companies c
    order by c.created_at desc limit 5
  ) s;

  return jsonb_build_object(
    'metrics', jsonb_build_object(
      'users',         (select count(*) from public.profiles where account_type = 'user'),
      'companies',     (select count(*) from public.companies),
      'vacancies',     (select count(*) from public.vacancies),
      'posts',         (select count(*) from public.posts),
      'messages',      (select count(*) from public.messages),
      'newUsers7d',    (select count(*) from public.profiles where account_type = 'user' and created_at >= now() - interval '7 days'),
      'newCompanies7d',(select count(*) from public.companies where created_at >= now() - interval '7 days'),
      'activeUsers24h',(select count(*) from public.profiles where last_seen_at >= now() - interval '24 hours')
    ),
    'realtime', jsonb_build_object(
      'online',            (select count(*) from public.profiles where last_seen_at >= now() - interval '5 minutes'),
      'newUsersToday',     (select count(*) from public.profiles where account_type = 'user' and created_at::date = now()::date),
      'newCompaniesToday', (select count(*) from public.companies where created_at::date = now()::date),
      'newVacanciesToday', (select count(*) from public.vacancies where created_at::date = now()::date),
      'postsToday',        (select count(*) from public.posts where created_at::date = now()::date)
    ),
    'userGrowth', v_growth,
    'registrations', v_reg,
    'latestUsers', v_latest_users,
    'latestCompanies', v_latest_companies
  );
end; $$;
