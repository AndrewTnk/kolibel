-- 0051_platform_updates.sql
-- Статьи-обновления платформы («Update»).
-- 1) Роль «издатель обновлений» — отдельная таблица publisher_roles (НЕ admin_roles:
--    is_staff() проверяет само наличие строки там, издатель получил бы права модератора).
--    Выдаёт/снимает ТОЛЬКО admin через RPC admin_set_publisher.
-- 2) Серверный енфорс категории 'Update' в политиках articles (иначе любой мог бы
--    создать статью-апдейт прямым REST-запросом мимо фронтового гейта).
-- 3) RPC has_viewed_article — «прочитана ли статья мной» (по article_views; сама
--    отметка прочтения — существующий increment_article_views со страницы статьи).

-- ── Роль издателя ────────────────────────────────────────────
create table if not exists public.publisher_roles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.publisher_roles enable row level security;

-- Свою строку видит владелец (гейт категории в редакторе); все строки — admin (админка).
drop policy if exists publisher_roles_select on public.publisher_roles;
create policy publisher_roles_select on public.publisher_roles for select
  using (profile_id = auth.uid() or public.is_admin());

-- Запись — только через security definer RPC ниже (insert/update/delete политик нет).

create or replace function public.admin_set_publisher(p_profile_id uuid, p_grant boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Недостаточно прав';
  end if;
  if p_grant then
    insert into public.publisher_roles (profile_id, granted_by)
    values (p_profile_id, auth.uid())
    on conflict (profile_id) do nothing;
  else
    delete from public.publisher_roles where profile_id = p_profile_id;
  end if;
end;
$$;

grant execute on function public.admin_set_publisher(uuid, boolean) to authenticated;

-- ── Гард категории 'Update' в политиках articles ─────────────
-- (переопределяют политики из 0043; select/delete не трогаем)
drop policy if exists articles_insert on public.articles;
create policy articles_insert on public.articles for insert
  with check (
    author_id = auth.uid()
    and (
      category <> 'Update'
      or exists (select 1 from public.publisher_roles pr where pr.profile_id = auth.uid())
    )
  );

drop policy if exists articles_update on public.articles;
create policy articles_update on public.articles for update
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and (
      category <> 'Update'
      or exists (select 1 from public.publisher_roles pr where pr.profile_id = auth.uid())
    )
  );

-- ── «Читал ли я статью» (для бейджа непрочитанного апдейта) ──
-- security definer: RLS article_views отдаёт строки только автору статьи,
-- а здесь нужен ответ про СВОЙ просмотр чужой статьи. Свою статью считаем прочитанной.
create or replace function public.has_viewed_article(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_author uuid;
begin
  if v_uid is null then
    return false;
  end if;
  select author_id into v_author from public.articles where id = p_id;
  if v_author is null then
    return false;
  end if;
  if v_author = v_uid then
    return true;
  end if;
  return exists (
    select 1 from public.article_views
    where article_id = p_id and viewer_id = v_uid
  );
end;
$$;

grant execute on function public.has_viewed_article(uuid) to authenticated;
