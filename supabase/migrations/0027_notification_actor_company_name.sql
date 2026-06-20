-- ============================================================
-- 0027_notification_actor_company_name.sql
-- Фикс: в уведомлениях имя актора-КОМПАНИИ показывалось как «Пользователь».
-- Триггеры 0012 брали имя из profiles.full_name, который у аккаунтов-компаний
-- пуст (название живёт в companies.name) → fallback «Пользователь».
-- Здесь добавляем хелпер display_name(id) (profiles.full_name → companies.name →
-- «Пользователь») и переопределяем триггеры follow/message на него.
-- Затрагивает только НОВЫЕ уведомления (старые строки в БД не переписываются).
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- Хелпер: отображаемое имя аккаунта (человек или компания).
create or replace function public.display_name(p_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif(trim(p.full_name), ''),
    nullif(trim(c.name), ''),
    'Пользователь'
  )
  from public.profiles p
  left join public.companies c on c.id = p.id
  where p.id = p_id;
$$;

-- Триггер: новый подписчик (актор может быть компанией).
create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text;
begin
  v_actor := public.display_name(new.follower_id);
  insert into public.notifications (user_id, actor_id, kind, title, body, link)
  values (new.followee_id, new.follower_id, 'follow',
          coalesce(v_actor, 'Пользователь'),
          'Подписался(ась) на ваши обновления',
          '/u/' || new.follower_id);
  return new;
end; $$;

-- Триггер: новое сообщение (отправитель может быть компанией — напр. автоответ HR).
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text;
begin
  v_actor := public.display_name(new.sender_id);
  insert into public.notifications (user_id, actor_id, kind, title, body, link)
  select cp.user_id, new.sender_id, 'message',
         coalesce(v_actor, 'Пользователь'),
         'Новое сообщение: «' || left(new.body, 80) || '»',
         '/chat'
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id;
  return new;
end; $$;
