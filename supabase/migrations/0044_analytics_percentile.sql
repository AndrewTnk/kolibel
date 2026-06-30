-- ============================================================
-- 0044_analytics_percentile.sql
-- Добавляет в аналитику профиля РЕАЛЬНЫЙ перцентиль: «профиль сильнее по
-- просмотрам, чем у N% похожих профилей» (среди профилей того же типа за 7 дней).
-- Заменяет мок-«78%» в карточке «Аналитика профиля».
-- Полностью переопределяет get_profile_analytics из 0024 (добавлен только блок
-- перцентиля + поле 'viewsPercentile' в ответе).
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

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
  v_percentile int;
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

  -- Перцентиль профиля по просмотрам за 7 дней среди профилей того же типа:
  -- доля «похожих профилей» со строго меньшим числом просмотров.
  with vc as (
    select profile_id, count(*)::int as v
    from public.profile_views
    where created_at >= w_start
    group by profile_id
  ),
  peers as (
    select coalesce(vcx.v, 0) as v
    from public.profiles p
    left join vc vcx on vcx.profile_id = p.id
    where p.id <> p_profile_id
      and (p.account_type = 'company') = v_is_company
  )
  select case when count(*) = 0 then 0
              else round(count(*) filter (where v < views_cur) * 100.0 / count(*))::int end
    into v_percentile
  from peers;

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
    'viewsPercentile', coalesce(v_percentile, 0),
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
