-- ============================================================
-- 0035_notification_entity.sql
-- Группировка и навигация уведомлений: добавляем notifications.entity_id
-- (объект, к которому относится уведомление) и переопределяем триггеры так,
-- чтобы link вёл к нужному контенту, а entity_id позволял группировать
-- одинаковые действия по объекту на клиенте.
--   • like/comment/reply/comment_like → entity_id = post_id, link = /?post=:postId
--     (пост открывается якорем на главной, без отдельной страницы)
--   • follow                          → entity_id = follower_id, link = /u/:id
--   • message                         → entity_id = conversation_id, link = /chat
--   • application                     → entity_id = vacancy_id, link = /my-vacancies
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run (после 0028/0029).
-- ============================================================

-- 1) Колонка объекта -----------------------------------------------------
alter table public.notifications
  add column if not exists entity_id uuid;

-- 2) Подписка → профиль подписавшегося -----------------------------------
create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text;
begin
  v_actor := public.display_name(new.follower_id);
  insert into public.notifications (user_id, actor_id, kind, title, body, link, entity_id)
  values (new.followee_id, new.follower_id, 'follow',
          coalesce(v_actor, 'Пользователь'),
          'Подписался(ась) на ваши обновления',
          '/u/' || new.follower_id,
          new.follower_id);
  return new;
end; $$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_on_follow();

-- 3) Отклик на вакансию --------------------------------------------------
create or replace function public.notify_on_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select company_id, title into v_owner, v_title
    from public.vacancies where id = new.vacancy_id;
  if v_owner is null or v_owner = new.applicant_id then
    return new;
  end if;
  v_actor := nullif(new.applicant_name, '');
  if v_actor is null then
    v_actor := public.display_name(new.applicant_id);
  end if;
  insert into public.notifications (user_id, actor_id, kind, title, body, link, entity_id)
  values (v_owner, new.applicant_id, 'application',
          coalesce(v_actor, 'Кандидат'),
          'Откликнулся на вакансию «' || coalesce(v_title, '') || '»',
          '/my-vacancies',
          new.vacancy_id);
  return new;
end; $$;

drop trigger if exists applications_notify on public.vacancy_applications;
create trigger applications_notify after insert on public.vacancy_applications
  for each row execute function public.notify_on_application();

-- 4) Новое сообщение → чат -----------------------------------------------
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text;
begin
  v_actor := public.display_name(new.sender_id);
  insert into public.notifications (user_id, actor_id, kind, title, body, link, entity_id)
  select cp.user_id, new.sender_id, 'message',
         coalesce(v_actor, 'Пользователь'),
         'Новое сообщение',
         '/chat',
         new.conversation_id
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id;
  return new;
end; $$;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_on_message();

-- 5) Лайк поста → пост ---------------------------------------------------
create or replace function public.notify_on_post_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_actor text;
begin
  select author_id into v_owner from public.posts where id = new.post_id;
  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;
  v_actor := public.display_name(new.user_id);
  insert into public.notifications (user_id, actor_id, kind, title, body, link, entity_id)
  values (v_owner, new.user_id, 'like',
          coalesce(v_actor, 'Пользователь'),
          'Оценил(а) вашу публикацию',
          '/?post=' || new.post_id,
          new.post_id);
  return new;
end; $$;

drop trigger if exists post_likes_notify on public.post_likes;
create trigger post_likes_notify after insert on public.post_likes
  for each row execute function public.notify_on_post_like();

-- 6) Лайк комментария → пост этого комментария ---------------------------
create or replace function public.notify_on_comment_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_actor text; v_post uuid;
begin
  select author_id, post_id into v_owner, v_post
    from public.post_comments where id = new.comment_id;
  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;
  v_actor := public.display_name(new.user_id);
  insert into public.notifications (user_id, actor_id, kind, title, body, link, entity_id)
  values (v_owner, new.user_id, 'comment_like',
          coalesce(v_actor, 'Пользователь'),
          'Оценил(а) ваш комментарий',
          '/?post=' || v_post,
          v_post);
  return new;
end; $$;

drop trigger if exists post_comment_likes_notify on public.post_comment_likes;
create trigger post_comment_likes_notify after insert on public.post_comment_likes
  for each row execute function public.notify_on_comment_like();

-- 7) Комментарий / ответ → пост ------------------------------------------
create or replace function public.notify_on_post_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_actor text;
begin
  v_actor := public.display_name(new.author_id);
  if new.parent_id is not null then
    select author_id into v_target from public.post_comments where id = new.parent_id;
    if v_target is null or v_target = new.author_id then
      return new;
    end if;
    insert into public.notifications (user_id, actor_id, kind, title, body, link, entity_id)
    values (v_target, new.author_id, 'reply',
            coalesce(v_actor, 'Пользователь'),
            'Ответил(а): «' || left(new.content, 80) || '»',
            '/?post=' || new.post_id,
            new.post_id);
  else
    select author_id into v_target from public.posts where id = new.post_id;
    if v_target is null or v_target = new.author_id then
      return new;
    end if;
    insert into public.notifications (user_id, actor_id, kind, title, body, link, entity_id)
    values (v_target, new.author_id, 'comment',
            coalesce(v_actor, 'Пользователь'),
            'Прокомментировал(а): «' || left(new.content, 80) || '»',
            '/?post=' || new.post_id,
            new.post_id);
  end if;
  return new;
end; $$;

drop trigger if exists post_comments_notify on public.post_comments;
create trigger post_comments_notify after insert on public.post_comments
  for each row execute function public.notify_on_post_comment();
