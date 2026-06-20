-- ============================================================
-- 0012_notifications.sql
-- Уведомления: таблица + триггеры, которые сами создают уведомления
-- на событиях (новый подписчик, новый отклик, новое сообщение).
-- Триггеры security definer — вставляют в обход RLS.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Таблица --------------------------------------------------
create table if not exists public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade, -- получатель
  actor_id   uuid        references public.profiles (id) on delete set null,         -- кто инициировал
  kind       text        not null check (kind in ('application','message','follow','vacancy','system')),
  title      text        not null default '',
  body       text        not null default '',
  link       text,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- 2) RLS ------------------------------------------------------
alter table public.notifications enable row level security;

-- Вижу только свои уведомления.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select
  using (user_id = auth.uid());

-- Помечать прочитанным — только свои.
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Удалять — только свои.
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications for delete
  using (user_id = auth.uid());
-- (insert-политики нет: уведомления создают только триггеры ниже, security definer.)

-- 3) Триггер: новый подписчик --------------------------------
create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text;
begin
  select coalesce(nullif(full_name, ''), 'Пользователь') into v_actor
    from public.profiles where id = new.follower_id;
  insert into public.notifications (user_id, actor_id, kind, title, body, link)
  values (new.followee_id, new.follower_id, 'follow',
          coalesce(v_actor, 'Пользователь'),
          'Подписался(ась) на ваши обновления',
          '/u/' || new.follower_id);
  return new;
end; $$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_on_follow();

-- 4) Триггер: новый отклик на вакансию -----------------------
create or replace function public.notify_on_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select company_id, title into v_owner, v_title
    from public.vacancies where id = new.vacancy_id;
  if v_owner is null or v_owner = new.applicant_id then
    return new; -- вакансия-пример без владельца или отклик на свою — пропускаем
  end if;
  v_actor := nullif(new.applicant_name, '');
  if v_actor is null then
    select coalesce(nullif(full_name, ''), 'Кандидат') into v_actor
      from public.profiles where id = new.applicant_id;
  end if;
  insert into public.notifications (user_id, actor_id, kind, title, body, link)
  values (v_owner, new.applicant_id, 'application',
          coalesce(v_actor, 'Кандидат'),
          'Откликнулся на вакансию «' || coalesce(v_title, '') || '»',
          '/my-vacancies');
  return new;
end; $$;

drop trigger if exists applications_notify on public.vacancy_applications;
create trigger applications_notify after insert on public.vacancy_applications
  for each row execute function public.notify_on_application();

-- 5) Триггер: новое сообщение --------------------------------
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text;
begin
  select coalesce(nullif(full_name, ''), 'Пользователь') into v_actor
    from public.profiles where id = new.sender_id;
  -- уведомляем всех участников беседы, кроме отправителя
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

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_on_message();

-- 6) Realtime -------------------------------------------------
alter publication supabase_realtime add table public.notifications;
