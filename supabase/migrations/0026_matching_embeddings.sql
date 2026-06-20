-- ============================================================
-- 0026_matching_embeddings.sql  (ЗАГОТОВКА v2 — семантический матчинг)
-- pgvector: эмбеддинги вакансий и профилей + RPC косинус-похожести.
-- ⚠️ Сама по себе ничего не «оживляет»: вектора заполняет Edge Function
--    `supabase/functions/embed` (нужен ключ провайдера эмбеддингов).
-- ⚠️ Размерность vector(1024) — под многоязычную модель (voyage-multilingual-2 /
--    bge-m3). Если возьмёшь другую модель — поменяй число на её размерность
--    (OpenAI text-embedding-3-small = 1536).
-- Применять ПОСЛЕ настройки провайдера (см. README рядом с функцией).
-- ============================================================

create extension if not exists vector;

alter table public.vacancies add column if not exists embedding vector(1024);
alter table public.profiles  add column if not exists embedding vector(1024);

-- HNSW-индексы (косинус) — строятся и на пустых таблицах, обучения не требуют.
create index if not exists vacancies_embedding_idx
  on public.vacancies using hnsw (embedding vector_cosine_ops);
create index if not exists profiles_embedding_idx
  on public.profiles using hnsw (embedding vector_cosine_ops);

-- Вакансии под кандидата (по его эмбеддингу), по убыванию похожести.
create or replace function public.match_vacancies_for(p_profile_id uuid, p_limit int default 20)
returns table (id uuid, similarity real)
language sql
stable
as $$
  select v.id, 1 - (v.embedding <=> p.embedding) as similarity
  from public.profiles p
  cross join lateral (
    select id, embedding from public.vacancies
    where embedding is not null and status = 'active'
  ) v
  where p.id = p_profile_id and p.embedding is not null
  order by v.embedding <=> p.embedding
  limit p_limit;
$$;

-- Кандидаты под вакансию (по её эмбеддингу), по убыванию похожести.
create or replace function public.match_candidates_for(p_vacancy_id uuid, p_limit int default 20)
returns table (id uuid, similarity real)
language sql
stable
as $$
  select pr.id, 1 - (pr.embedding <=> v.embedding) as similarity
  from public.vacancies v
  cross join lateral (
    select id, embedding from public.profiles
    where embedding is not null and account_type = 'user'
  ) pr
  where v.id = p_vacancy_id and v.embedding is not null
  order by pr.embedding <=> v.embedding
  limit p_limit;
$$;
