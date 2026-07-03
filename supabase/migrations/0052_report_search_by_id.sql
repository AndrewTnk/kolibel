-- 0052: Поиск жалоб по номеру (ID) в админке.
--
-- Детальная панель показывает номер жалобы как «Жалоба #xxxxxxxx» (первые 8
-- символов UUID, см. 0048), но поиск в get_admin_reports (0037) матчил только
-- category/description — найти жалобу по номеру было нельзя.
--
-- Переопределяет get_admin_reports: p_search дополнительно матчится по началу
-- r.id::text (префикс). Работают все варианты ввода: «#356262f2», «356262f2»
-- и полный UUID (решётка и пробелы по краям отбрасываются). Остальная логика
-- функции — без изменений (копия из 0037).
--
-- Применить: Supabase Dashboard → SQL Editor → вставить целиком → Run. Идемпотентно.

create or replace function public.get_admin_reports(
  p_bucket text default '', p_type text default '', p_priority text default '',
  p_search text default '', p_limit int default 10, p_offset int default 0)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare
  v_rows jsonb; v_total int; v_counts jsonb;
  -- Запрос для поиска по ID: без «#» и пробелов, в нижнем регистре (uuid::text всегда lower).
  v_id_q text := replace(lower(trim(coalesce(p_search, ''))), '#', '');
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
    and (coalesce(p_search, '') = ''
         or r.category ilike '%' || p_search || '%'
         or r.description ilike '%' || p_search || '%'
         or (v_id_q <> '' and r.id::text like v_id_q || '%'));

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
      and (coalesce(p_search, '') = ''
           or r.category ilike '%' || p_search || '%'
           or r.description ilike '%' || p_search || '%'
           or (v_id_q <> '' and r.id::text like v_id_q || '%'))
    order by r.created_at desc limit p_limit offset p_offset
  ) s;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'counts', v_counts);
end; $$;
