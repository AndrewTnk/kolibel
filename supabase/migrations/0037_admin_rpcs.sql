-- ============================================================
-- 0037_admin_rpcs.sql
-- RPC админ-панели: чтение метрик/списков (security definer, в обход RLS —
-- нужно для агрегатов по всем строкам и для email из auth.users) + действия
-- модерации. КАЖДАЯ функция первой строкой проверяет роль (is_staff/is_admin).
-- Применять ПОСЛЕ 0036. Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 0) Хелперы резолва имён/аватаров --------------------------------------
-- Актор (тот, у кого есть строка в profiles): юзер или компания.
create or replace function public.admin_actor(p_id uuid)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare r jsonb;
begin
  if p_id is null then return null; end if;
  select case when p.account_type = 'company'
    then jsonb_build_object('id', p.id, 'name', coalesce(nullif(c.name, ''), 'Компания'),
                            'avatar', coalesce(c.logo_url, c.avatar_url), 'kind', 'company')
    else jsonb_build_object('id', p.id, 'name', coalesce(nullif(p.full_name, ''), 'Пользователь'),
                            'avatar', p.avatar_url, 'kind', 'user')
  end
  into r
  from public.profiles p
  left join public.companies c on c.id = p.id
  where p.id = p_id;
  return coalesce(r, jsonb_build_object('id', p_id, 'name', 'Пользователь', 'avatar', null, 'kind', 'user'));
end; $$;

-- Цель жалобы (любой из 5 типов).
create or replace function public.admin_entity(p_type text, p_id uuid)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare r jsonb;
begin
  if p_type in ('user', 'company') then
    return public.admin_actor(p_id) || jsonb_build_object('sub', case when p_type = 'company' then 'Компания' else 'Пользователь' end);
  elsif p_type = 'post' then
    select jsonb_build_object('id', id, 'name', coalesce(nullif(author_name, ''), 'Пользователь'),
                             'avatar', author_avatar, 'kind', coalesce(author_kind, 'user'), 'sub', 'Публикация')
      into r from public.posts where id = p_id;
  elsif p_type = 'comment' then
    select jsonb_build_object('id', id, 'name', coalesce(nullif(author_name, ''), 'Пользователь'),
                             'avatar', author_avatar, 'kind', coalesce(author_kind, 'user'), 'sub', 'Комментарий')
      into r from public.post_comments where id = p_id;
  elsif p_type = 'vacancy' then
    select jsonb_build_object('id', v.id, 'name', coalesce(nullif(v.title, ''), 'Вакансия'),
                             'avatar', c.logo_url, 'kind', 'vacancy',
                             'sub', coalesce(nullif(v.company, ''), c.name, 'Вакансия'))
      into r from public.vacancies v left join public.companies c on c.id = v.company_id where v.id = p_id;
  end if;
  return coalesce(r, jsonb_build_object('id', p_id, 'name', '—', 'avatar', null, 'kind', p_type, 'sub', p_type));
end; $$;

-- ============================================================
-- ЧТЕНИЕ
-- ============================================================

-- 1) Дашборд (Главная) ---------------------------------------------------
create or replace function public.get_admin_overview()
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare
  v_growth jsonb; v_reg jsonb; v_latest_users jsonb; v_latest_companies jsonb;
begin
  -- Дашборд — только admin (фаундер). Модераторам общая статистика недоступна.
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;

  -- Рост пользователей (накопительно, 30 дней)
  select coalesce(jsonb_agg(jsonb_build_object('d', d, 'total', total) order by d), '[]'::jsonb) into v_growth
  from (
    select gs::date d,
      (select count(*) from public.profiles where account_type = 'user' and created_at::date <= gs::date) total
    from generate_series(now()::date - 29, now()::date, interval '1 day') gs
  ) t;

  -- Регистрации/активность по дням (30 дней). active = последний визит в этот день (исторических данных нет → точно только для свежих).
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

-- 2) Пользователи --------------------------------------------------------
create or replace function public.get_admin_users(
  p_search text default '', p_status text default '', p_limit int default 20, p_offset int default 0)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare v_rows jsonb; v_total int;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  select count(*) into v_total
  from public.profiles p join auth.users au on au.id = p.id
  where p.account_type = 'user'
    and (coalesce(p_search, '') = '' or p.full_name ilike '%' || p_search || '%' or au.email ilike '%' || p_search || '%')
    and (coalesce(p_status, '') = '' or p.status = p_status);

  select coalesce(jsonb_agg(x order by created_at desc), '[]'::jsonb) into v_rows from (
    select p.created_at, jsonb_build_object(
      'id', p.id, 'name', coalesce(nullif(p.full_name, ''), 'Без имени'), 'email', au.email,
      'avatar', p.avatar_url, 'jobTitle', nullif(p.job_title, ''),
      'createdAt', p.created_at, 'lastSeen', p.last_seen_at, 'status', p.status,
      'role', (select role from public.admin_roles ar where ar.user_id = p.id)) x
    from public.profiles p join auth.users au on au.id = p.id
    where p.account_type = 'user'
      and (coalesce(p_search, '') = '' or p.full_name ilike '%' || p_search || '%' or au.email ilike '%' || p_search || '%')
      and (coalesce(p_status, '') = '' or p.status = p_status)
    order by p.created_at desc limit p_limit offset p_offset
  ) s;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end; $$;

-- 3) Компании ------------------------------------------------------------
create or replace function public.get_admin_companies(
  p_search text default '', p_status text default '', p_limit int default 20, p_offset int default 0)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare v_rows jsonb; v_total int;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  select count(*) into v_total
  from public.companies c join public.profiles p on p.id = c.id
  where (coalesce(p_search, '') = '' or c.name ilike '%' || p_search || '%')
    and (coalesce(p_status, '') = '' or p.status = p_status);

  select coalesce(jsonb_agg(x order by created_at desc), '[]'::jsonb) into v_rows from (
    select c.created_at, jsonb_build_object(
      'id', c.id, 'name', coalesce(nullif(c.name, ''), 'Без названия'),
      'logo', coalesce(c.logo_url, c.avatar_url),
      'founder', coalesce(c.contacts -> 'founder' ->> 'name', ''),
      'industry', nullif(c.industry, ''),
      'createdAt', c.created_at, 'status', p.status,
      'vacancyCount', (select count(*) from public.vacancies v where v.company_id = c.id),
      'followerCount', (select count(*) from public.follows f where f.followee_id = c.id)) x
    from public.companies c join public.profiles p on p.id = c.id
    where (coalesce(p_search, '') = '' or c.name ilike '%' || p_search || '%')
      and (coalesce(p_status, '') = '' or p.status = p_status)
    order by c.created_at desc limit p_limit offset p_offset
  ) s;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end; $$;

-- 4) Вакансии ------------------------------------------------------------
create or replace function public.get_admin_vacancies(
  p_search text default '', p_moderation text default '', p_limit int default 20, p_offset int default 0)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare v_rows jsonb; v_total int;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  select count(*) into v_total
  from public.vacancies v
  where (coalesce(p_search, '') = '' or v.title ilike '%' || p_search || '%')
    and (coalesce(p_moderation, '') = '' or coalesce(v.moderation, 'visible') = p_moderation);

  select coalesce(jsonb_agg(x order by created_at desc), '[]'::jsonb) into v_rows from (
    select v.created_at, jsonb_build_object(
      'id', v.id, 'title', coalesce(nullif(v.title, ''), 'Без названия'),
      'company', coalesce(nullif(v.company, ''), nullif(c.name, ''), '—'), 'companyLogo', c.logo_url,
      'createdAt', v.created_at, 'status', v.status, 'moderation', coalesce(v.moderation, 'visible'),
      'applicationCount', (select count(*) from public.vacancy_applications va where va.vacancy_id = v.id)) x
    from public.vacancies v left join public.companies c on c.id = v.company_id
    where (coalesce(p_search, '') = '' or v.title ilike '%' || p_search || '%')
      and (coalesce(p_moderation, '') = '' or coalesce(v.moderation, 'visible') = p_moderation)
    order by v.created_at desc limit p_limit offset p_offset
  ) s;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end; $$;

-- 5) Посты ---------------------------------------------------------------
create or replace function public.get_admin_posts(
  p_search text default '', p_state text default '', p_limit int default 20, p_offset int default 0)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare v_rows jsonb; v_total int;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  select count(*) into v_total
  from public.posts pt
  where (coalesce(p_search, '') = '' or pt.author_name ilike '%' || p_search || '%')
    and (p_state = '' or (p_state = 'removed') = (pt.removed_at is not null));

  select coalesce(jsonb_agg(x order by created_at desc), '[]'::jsonb) into v_rows from (
    select pt.created_at, jsonb_build_object(
      'id', pt.id, 'authorId', pt.author_id, 'authorName', coalesce(nullif(pt.author_name, ''), 'Пользователь'),
      'authorAvatar', pt.author_avatar, 'authorKind', coalesce(pt.author_kind, 'user'),
      'excerpt', coalesce((select string_agg(b ->> 'text', ' ') from jsonb_array_elements(pt.content) b where b ->> 'type' = 'text'), ''),
      'createdAt', pt.created_at, 'removed', pt.removed_at is not null,
      'likeCount', (select count(*) from public.post_likes pl where pl.post_id = pt.id),
      'commentCount', (select count(*) from public.post_comments pc where pc.post_id = pt.id and pc.removed_at is null)) x
    from public.posts pt
    where (coalesce(p_search, '') = '' or pt.author_name ilike '%' || p_search || '%')
      and (p_state = '' or (p_state = 'removed') = (pt.removed_at is not null))
    order by pt.created_at desc limit p_limit offset p_offset
  ) s;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end; $$;

-- 6) Комментарии ---------------------------------------------------------
create or replace function public.get_admin_comments(
  p_search text default '', p_state text default '', p_limit int default 20, p_offset int default 0)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare v_rows jsonb; v_total int;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  select count(*) into v_total
  from public.post_comments pc
  where (coalesce(p_search, '') = '' or pc.author_name ilike '%' || p_search || '%' or pc.content ilike '%' || p_search || '%')
    and (p_state = '' or (p_state = 'removed') = (pc.removed_at is not null));

  select coalesce(jsonb_agg(x order by created_at desc), '[]'::jsonb) into v_rows from (
    select pc.created_at, jsonb_build_object(
      'id', pc.id, 'postId', pc.post_id, 'authorId', pc.author_id,
      'authorName', coalesce(nullif(pc.author_name, ''), 'Пользователь'), 'authorAvatar', pc.author_avatar,
      'content', pc.content, 'createdAt', pc.created_at, 'removed', pc.removed_at is not null) x
    from public.post_comments pc
    where (coalesce(p_search, '') = '' or pc.author_name ilike '%' || p_search || '%' or pc.content ilike '%' || p_search || '%')
      and (p_state = '' or (p_state = 'removed') = (pc.removed_at is not null))
    order by pc.created_at desc limit p_limit offset p_offset
  ) s;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end; $$;

-- 7) Жалобы — список + счётчики ------------------------------------------
-- p_bucket: '' | 'reviewing' | 'attention' | 'resolved' | 'rejected'
create or replace function public.get_admin_reports(
  p_bucket text default '', p_type text default '', p_priority text default '',
  p_search text default '', p_limit int default 10, p_offset int default 0)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare v_rows jsonb; v_total int; v_counts jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  -- Счётчики по корзинам (для карточек-метрик и табов)
  select jsonb_build_object(
    'all',       count(*),
    'reviewing', count(*) filter (where status in ('new', 'reviewing')),
    'attention', count(*) filter (where priority = 'high' and status in ('new', 'reviewing')),
    'resolved',  count(*) filter (where status = 'resolved'),
    'rejected',  count(*) filter (where status = 'rejected'),
    'new7d',     count(*) filter (where created_at >= now() - interval '7 days')
  ) into v_counts from public.reports;

  select count(*) into v_total
  from public.reports r
  where (p_bucket = '' or
         (p_bucket = 'reviewing' and r.status in ('new', 'reviewing')) or
         (p_bucket = 'attention' and r.priority = 'high' and r.status in ('new', 'reviewing')) or
         (p_bucket = 'resolved'  and r.status = 'resolved') or
         (p_bucket = 'rejected'  and r.status = 'rejected'))
    and (coalesce(p_type, '') = '' or r.target_type = p_type)
    and (coalesce(p_priority, '') = '' or r.priority = p_priority)
    and (coalesce(p_search, '') = '' or r.category ilike '%' || p_search || '%' or r.description ilike '%' || p_search || '%');

  select coalesce(jsonb_agg(x order by created_at desc), '[]'::jsonb) into v_rows from (
    select r.created_at, jsonb_build_object(
      'id', r.id, 'category', r.category, 'targetType', r.target_type,
      'target', public.admin_entity(r.target_type, r.target_id),
      'reporter', public.admin_actor(r.reporter_id),
      'priority', r.priority, 'status', r.status, 'createdAt', r.created_at) x
    from public.reports r
    where (p_bucket = '' or
           (p_bucket = 'reviewing' and r.status in ('new', 'reviewing')) or
           (p_bucket = 'attention' and r.priority = 'high' and r.status in ('new', 'reviewing')) or
           (p_bucket = 'resolved'  and r.status = 'resolved') or
           (p_bucket = 'rejected'  and r.status = 'rejected'))
      and (coalesce(p_type, '') = '' or r.target_type = p_type)
      and (coalesce(p_priority, '') = '' or r.priority = p_priority)
      and (coalesce(p_search, '') = '' or r.category ilike '%' || p_search || '%' or r.description ilike '%' || p_search || '%')
    order by r.created_at desc limit p_limit offset p_offset
  ) s;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'counts', v_counts);
end; $$;

-- 8) Жалоба — детально ---------------------------------------------------
create or replace function public.get_admin_report(p_id uuid)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare r public.reports%rowtype; v_content jsonb; v_history jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.reports where id = p_id;
  if not found then return null; end if;

  -- Превью контента, на который жалуются
  if r.target_type = 'post' then
    select jsonb_build_object('kind', 'post',
      'text', coalesce((select string_agg(b ->> 'text', ' ') from jsonb_array_elements(content) b where b ->> 'type' = 'text'), ''),
      'createdAt', created_at, 'removed', removed_at is not null)
      into v_content from public.posts where id = r.target_id;
  elsif r.target_type = 'comment' then
    select jsonb_build_object('kind', 'comment', 'text', content, 'createdAt', created_at, 'removed', removed_at is not null)
      into v_content from public.post_comments where id = r.target_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'action', a.action, 'note', a.note, 'createdAt', a.created_at,
    'actor', public.admin_actor(a.actor_id)) order by a.created_at), '[]'::jsonb)
    into v_history from public.report_actions a where a.report_id = p_id;

  return jsonb_build_object(
    'id', r.id, 'category', r.category, 'description', r.description,
    'targetType', r.target_type, 'target', public.admin_entity(r.target_type, r.target_id),
    'reporter', public.admin_actor(r.reporter_id), 'assigned', public.admin_actor(r.assigned_to),
    'priority', r.priority, 'status', r.status, 'moderatorComment', r.moderator_comment,
    'evidence', r.evidence, 'createdAt', r.created_at, 'updatedAt', r.updated_at,
    'content', v_content, 'history', v_history
  );
end; $$;

-- 9) Аналитика платформы -------------------------------------------------
create or replace function public.get_admin_analytics()
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
begin
  -- Аналитика платформы — только admin.
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'applications',    (select count(*) from public.vacancy_applications),
    'applicationsSeen',(select count(*) from public.vacancy_applications where status <> 'new'),
    'conversations',   (select count(*) from public.conversations),
    'connections',     (select count(*) from public.follows),
    'profileViews',    (select count(*) from public.profile_views),
    'vacancyViews',    (select count(*) from public.vacancy_views),
    'applications7d',  (select count(*) from public.vacancy_applications where created_at >= now() - interval '7 days'),
    'conversations7d', (select count(*) from public.conversations where created_at >= now() - interval '7 days'),
    'connections7d',   (select count(*) from public.follows where created_at >= now() - interval '7 days'),
    'profileViews7d',  (select count(*) from public.profile_views where created_at >= now() - interval '7 days')
  );
end; $$;

-- ============================================================
-- ДЕЙСТВИЯ (модерация) — софт-статусы, без жёсткого удаления из auth
-- ============================================================

-- Статус аккаунта (юзер/компания — общий profiles.status)
create or replace function public.admin_set_account_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('active', 'blocked', 'deleted') then raise exception 'bad status'; end if;
  update public.profiles set status = p_status where id = p_id;
end; $$;

-- Модерация вакансии
create or replace function public.admin_set_vacancy_moderation(p_id uuid, p_moderation text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_moderation not in ('visible', 'hidden', 'removed') then raise exception 'bad moderation'; end if;
  update public.vacancies set moderation = p_moderation where id = p_id;
end; $$;

-- Удалить/восстановить пост
create or replace function public.admin_set_post_removed(p_id uuid, p_removed boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.posts set removed_at = case when p_removed then now() else null end where id = p_id;
end; $$;

-- Удалить/восстановить комментарий
create or replace function public.admin_set_comment_removed(p_id uuid, p_removed boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.post_comments set removed_at = case when p_removed then now() else null end where id = p_id;
end; $$;

-- ============================================================
-- ДЕЙСТВИЯ по жалобам (+ запись в историю report_actions)
-- ============================================================

-- Назначить жалобу на себя
create or replace function public.admin_assign_report(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.reports
    set assigned_to = auth.uid(), status = case when status = 'new' then 'reviewing' else status end
    where id = p_id;
  insert into public.report_actions (report_id, actor_id, action) values (p_id, auth.uid(), 'assigned');
end; $$;

-- Комментарий модератора
create or replace function public.admin_add_report_comment(p_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.reports set moderator_comment = coalesce(p_note, '') where id = p_id;
  insert into public.report_actions (report_id, actor_id, action, note) values (p_id, auth.uid(), 'comment', coalesce(p_note, ''));
end; $$;

-- Резолюция жалобы. p_resolution: 'measures' | 'warn' | 'block' | 'reject'
--   measures → resolved; warn → reviewing (+лог); block → блок цели + resolved; reject → rejected
create or replace function public.admin_resolve_report(p_id uuid, p_resolution text, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare r public.reports%rowtype;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.reports where id = p_id;
  if not found then raise exception 'report not found'; end if;

  if p_resolution = 'block' then
    -- Блокируем цель софт-статусом по типу
    if r.target_type in ('user', 'company') then
      update public.profiles set status = 'blocked' where id = r.target_id;
    elsif r.target_type = 'post' then
      update public.posts set removed_at = now() where id = r.target_id;
    elsif r.target_type = 'comment' then
      update public.post_comments set removed_at = now() where id = r.target_id;
    elsif r.target_type = 'vacancy' then
      update public.vacancies set moderation = 'removed' where id = r.target_id;
    end if;
  end if;

  update public.reports set
    status = case p_resolution
      when 'measures' then 'resolved'
      when 'block'    then 'resolved'
      when 'reject'   then 'rejected'
      else 'reviewing' end,
    assigned_to = coalesce(assigned_to, auth.uid()),
    moderator_comment = case when coalesce(p_note, '') <> '' then p_note else moderator_comment end
    where id = p_id;

  insert into public.report_actions (report_id, actor_id, action, note)
    values (p_id, auth.uid(), p_resolution, coalesce(p_note, ''));
end; $$;

-- ============================================================
-- УПРАВЛЕНИЕ РОЛЯМИ (только admin)
-- ============================================================
create or replace function public.admin_grant_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_role not in ('admin', 'moderator') then raise exception 'bad role'; end if;
  insert into public.admin_roles (user_id, role, granted_by)
    values (p_user_id, p_role, auth.uid())
    on conflict (user_id) do update set role = excluded.role, granted_by = excluded.granted_by;
end; $$;

create or replace function public.admin_revoke_role(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot revoke own role'; end if; -- защита от само-разжалования
  delete from public.admin_roles where user_id = p_user_id;
end; $$;
