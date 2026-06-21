-- ============================================================
-- 0028_like_comment_notifications.sql
-- Уведомления о лайках и комментариях к постам (триггеры security definer).
-- Расширяем допустимые kind ('like','comment') и добавляем триггеры на
-- post_likes / post_comments → уведомление автору поста (кроме своих действий).
-- Имя актора — через display_name(id) (человек/компания), как в 0027.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Расширяем набор допустимых типов уведомлений ------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('application','message','follow','vacancy','system','like','comment'));

-- 2) Триггер: лайк поста -------------------------------------
create or replace function public.notify_on_post_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_actor text;
begin
  select author_id into v_owner from public.posts where id = new.post_id;
  if v_owner is null or v_owner = new.user_id then
    return new; -- пост не найден или лайк собственного поста — пропускаем
  end if;
  v_actor := public.display_name(new.user_id);
  insert into public.notifications (user_id, actor_id, kind, title, body, link)
  values (v_owner, new.user_id, 'like',
          coalesce(v_actor, 'Пользователь'),
          'Оценил(а) вашу публикацию',
          '/profile');
  return new;
end; $$;

drop trigger if exists post_likes_notify on public.post_likes;
create trigger post_likes_notify after insert on public.post_likes
  for each row execute function public.notify_on_post_like();

-- 3) Триггер: комментарий к посту ----------------------------
create or replace function public.notify_on_post_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_actor text;
begin
  select author_id into v_owner from public.posts where id = new.post_id;
  if v_owner is null or v_owner = new.author_id then
    return new; -- пост не найден или комментарий к своему посту — пропускаем
  end if;
  v_actor := public.display_name(new.author_id);
  insert into public.notifications (user_id, actor_id, kind, title, body, link)
  values (v_owner, new.author_id, 'comment',
          coalesce(v_actor, 'Пользователь'),
          'Прокомментировал(а): «' || left(new.content, 80) || '»',
          '/profile');
  return new;
end; $$;

drop trigger if exists post_comments_notify on public.post_comments;
create trigger post_comments_notify after insert on public.post_comments
  for each row execute function public.notify_on_post_comment();
