-- ============================================================
-- 0049_hiring_redesign.sql
-- Переработка системы найма (см. HIRING_REDESIGN_PLAN.md, шаг 1):
--   1) saved_candidates — серверное ПРИВАТНОЕ избранное кандидатов у компании
--      (заменяет localStorage applicantFavorites; кандидат НЕ видит).
--   2) vacancy_applications.viewed_at + mark_application_viewed()
--      — отметка «компания открыла отклик» (статус «просмотрен» у соискателя).
--   3) get_candidate_engagement() — бейдж вовлечённости кандидата к компании
--      (только компании; агрегат из follows/post_*/profile_views/откликов).
-- Сопроводительное письмо колонки НЕ требует — переиспользуем существующую
--   vacancy_applications.note (уже есть из 0007, но не писалась/не показывалась).
-- Всё идемпотентно. Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Избранные кандидаты (приватный шорт-лист компании) -----------------
create table if not exists public.saved_candidates (
  company_id   uuid        not null references public.profiles (id) on delete cascade,
  candidate_id uuid        not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (company_id, candidate_id)
);
create index if not exists saved_candidates_company_idx
  on public.saved_candidates (company_id, created_at desc);

alter table public.saved_candidates enable row level security;

-- Приватно: видит/меняет только сама компания (кандидат не знает, что сохранён).
drop policy if exists saved_candidates_select_own on public.saved_candidates;
create policy saved_candidates_select_own on public.saved_candidates for select
  using (company_id = auth.uid());

drop policy if exists saved_candidates_insert_own on public.saved_candidates;
create policy saved_candidates_insert_own on public.saved_candidates for insert
  with check (company_id = auth.uid());

drop policy if exists saved_candidates_delete_own on public.saved_candidates;
create policy saved_candidates_delete_own on public.saved_candidates for delete
  using (company_id = auth.uid());

-- 2) Отметка просмотра отклика ------------------------------------------
alter table public.vacancy_applications
  add column if not exists viewed_at timestamptz;

-- Ставит viewed_at при открытии отклика владельцем вакансии (идемпотентно:
-- только если ещё не просмотрен). security definer — обходит RLS на update.
create or replace function public.mark_application_viewed(p_application uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vacancy_applications va
     set viewed_at = now()
    from public.vacancies v
   where va.id = p_application
     and v.id = va.vacancy_id
     and v.company_id = auth.uid()      -- только владелец вакансии
     and va.viewed_at is null;          -- фиксируем первый просмотр
end;
$$;

-- 3) Вовлечённость кандидата к компании (бейдж, видит только компания) ---
--    Компания = профиль (profiles.id == companies.id == auth.uid компании),
--    её посты = posts.author_id = p_company.
create or replace function public.get_candidate_engagement(p_candidate uuid, p_company uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_followed_at   timestamptz;
  v_comments      int;
  v_reactions     int;
  v_page_views    int;
  v_past_applies  int;
  v_warmth        text;
begin
  -- Доступ: компания видит вовлечённость только к самой себе.
  if auth.uid() is null or auth.uid() <> p_company then
    return null;
  end if;

  -- Подписан на компанию + с какого времени
  select created_at into v_followed_at
    from public.follows
   where followee_id = p_company and follower_id = p_candidate;

  -- Комментарии кандидата под постами компании
  select count(*) into v_comments
    from public.post_comments c
    join public.posts po on po.id = c.post_id
   where po.author_id = p_company and c.author_id = p_candidate;

  -- Лайки/реакции кандидата на постах компании
  select count(*) into v_reactions
    from public.post_likes l
    join public.posts po on po.id = l.post_id
   where po.author_id = p_company and l.user_id = p_candidate;

  -- Заходы кандидата на страницу компании
  select count(*) into v_page_views
    from public.profile_views
   where profile_id = p_company and viewer_id = p_candidate;

  -- Прошлые отклики кандидата на вакансии компании (включая текущий)
  select count(*) into v_past_applies
    from public.vacancy_applications va
    join public.vacancies v on v.id = va.vacancy_id
   where v.company_id = p_company and va.applicant_id = p_candidate;

  -- Классификация теплоты:
  --   hot   — активно взаимодействует (подписан / комментит / реагирует)
  --   known — есть след (заходил на страницу или откликался раньше), но без активности
  --   cold  — истории нет
  if v_followed_at is not null or coalesce(v_comments, 0) > 0 or coalesce(v_reactions, 0) > 0 then
    v_warmth := 'hot';
  elsif coalesce(v_page_views, 0) > 0 or coalesce(v_past_applies, 0) > 1 then
    v_warmth := 'known';
  else
    v_warmth := 'cold';
  end if;

  return jsonb_build_object(
    'warmth',           v_warmth,
    'isFollower',       v_followed_at is not null,
    'followedAt',       v_followed_at,
    'comments',         coalesce(v_comments, 0),
    'reactions',        coalesce(v_reactions, 0),
    'pageViews',        coalesce(v_page_views, 0),
    'pastApplications', coalesce(v_past_applies, 0)
  );
end;
$$;
