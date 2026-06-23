-- ============================================================
-- 0032_profile_privacy_activity.sql
-- Настройки приватности и активности профиля (MVP «Настройки аккаунта»):
--   • is_public      — публичность профиля (поиск/рекомендации/прямая ссылка);
--   • show_activity  — показывать ли «в сети»/«был(а) недавно»;
--   • last_seen_at   — последняя активность (обновляется heartbeat'ом из presence).
-- Покрывает И пользователей, И компании: у аккаунта-компании тоже есть строка
-- в profiles (account_type='company', id == companies.id == auth.users.id).
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Новые колонки -------------------------------------------------------
alter table public.profiles
  add column if not exists is_public     boolean     not null default true,
  add column if not exists show_activity boolean     not null default true,
  add column if not exists last_seen_at  timestamptz;

-- 2) updated_at не должен «дёргаться» от heartbeat'а last_seen_at ---------
--    Общая set_updated_at используется и companies (там нет last_seen_at),
--    поэтому НЕ трогаем её, а заводим отдельную функцию для profiles и
--    перевешиваем триггер profiles_set_updated_at на неё. Если в profiles
--    поменялся ТОЛЬКО last_seen_at — сохраняем прежний updated_at, чтобы
--    профиль не считался «отредактированным» при каждом пинге presence.
create or replace function public.profiles_set_updated_at_fn()
returns trigger
language plpgsql
as $$
begin
  if new.last_seen_at is distinct from old.last_seen_at
     and (to_jsonb(new) - 'last_seen_at' - 'updated_at')
       = (to_jsonb(old) - 'last_seen_at' - 'updated_at') then
    new.updated_at = old.updated_at;
  else
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.profiles_set_updated_at_fn();

-- 3) RPC для heartbeat'а: обновляет last_seen_at своего профиля -----------
--    security definer — чтобы не зависеть от прочих политик; пишет только себе.
create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set last_seen_at = now()
   where id = auth.uid();
$$;

grant execute on function public.touch_last_seen() to authenticated;
