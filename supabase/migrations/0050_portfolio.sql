-- 0050_portfolio.sql
-- Портфолио пользователя: таблица portfolio_items + RLS.
-- Карточки двух типов: image (файл в Storage) и link (внешняя ссылка с авто-превью
-- сайта — скриншот mShots через прокси /shot, GitHub OG, фавиконка-фолбэк).
-- Лимит 12 работ на профиль енфорсится клиентом (MVP).

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('image', 'link')),
  title text not null default '',
  url text not null default '',   -- image: публичный URL файла в Storage; link: внешняя ссылка
  cover_url text,                 -- своя обложка для link (пока без UI — задел на будущее)
  created_at timestamptz not null default now()
);

create index if not exists portfolio_items_owner_idx
  on public.portfolio_items(owner_id, created_at desc);

alter table public.portfolio_items enable row level security;

-- Видят все; работы заблокированного аккаунта скрыты (видят владелец и staff).
drop policy if exists portfolio_select on public.portfolio_items;
create policy portfolio_select on public.portfolio_items for select
  using (not public.is_account_blocked(owner_id) or owner_id = auth.uid() or public.is_staff());

drop policy if exists portfolio_insert on public.portfolio_items;
create policy portfolio_insert on public.portfolio_items for insert
  with check (owner_id = auth.uid());

drop policy if exists portfolio_update on public.portfolio_items;
create policy portfolio_update on public.portfolio_items for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists portfolio_delete on public.portfolio_items;
create policy portfolio_delete on public.portfolio_items for delete
  using (owner_id = auth.uid());
