-- 0043_articles.sql
-- Статьи (лонгриды) автора: таблица articles + просмотры (article_views) + RLS
-- + RPC increment_article_views (security definer, дедуп 30 мин, без самопросмотров).
-- Тело статьи хранится как markdown (text) — рендерится общим <Markdown>, пишется WYSIWYG-редактором.

-- ── Таблица статей ───────────────────────────────────────────
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default '',
  title text not null default '',
  subtitle text not null default '',
  cover_url text,                                   -- опциональная картинка-обложка (Storage)
  body text not null default '',                    -- markdown
  reading_minutes int not null default 1,           -- оценка времени чтения (показывается в шапке статьи)
  status text not null default 'published' check (status in ('draft', 'published')),
  views int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_author_idx on public.articles(author_id, coalesce(published_at, created_at) desc);

alter table public.articles enable row level security;

-- Опубликованные видят все; черновики — только автор и staff.
drop policy if exists articles_select on public.articles;
create policy articles_select on public.articles for select
  using (status = 'published' or author_id = auth.uid() or public.is_staff());

drop policy if exists articles_insert on public.articles;
create policy articles_insert on public.articles for insert
  with check (author_id = auth.uid());

drop policy if exists articles_update on public.articles;
create policy articles_update on public.articles for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists articles_delete on public.articles;
create policy articles_delete on public.articles for delete
  using (author_id = auth.uid());

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at before update on public.articles
  for each row execute function public.set_updated_at();

-- ── Просмотры статей (для счётчика «Просмотрело: N» и аналитики) ──
create table if not exists public.article_views (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.articles(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists article_views_article_idx on public.article_views(article_id, created_at desc);

alter table public.article_views enable row level security;

-- Свои просмотры видит автор статьи; вставка — только через security-definer RPC.
drop policy if exists article_views_select on public.article_views;
create policy article_views_select on public.article_views for select
  using (exists (
    select 1 from public.articles a where a.id = article_id and a.author_id = auth.uid()
  ));

-- ── RPC: засчитать просмотр (дедуп 30 мин, не считаем автора) ──
create or replace function public.increment_article_views(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_author uuid;
begin
  select author_id into v_author from public.articles where id = p_id;
  if v_author is null then return; end if;
  if v_author = v_uid then return; end if; -- свою статью не считаем

  if v_uid is not null and exists (
    select 1 from public.article_views
    where article_id = p_id and viewer_id = v_uid and created_at > now() - interval '30 minutes'
  ) then
    return; -- уже смотрел недавно — не накручиваем
  end if;

  insert into public.article_views (article_id, viewer_id) values (p_id, v_uid);
  update public.articles set views = views + 1 where id = p_id;
end;
$$;

grant execute on function public.increment_article_views(uuid) to authenticated;
