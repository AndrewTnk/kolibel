-- ============================================================
-- 0029_comment_replies_likes.sql
-- Комментарии: ответы (один уровень) + лайки комментариев + уведомления.
--   • post_comments.parent_id — ответ на комментарий (каскад при удалении корня)
--   • post_comment_likes — лайки комментариев (как post_likes для постов)
--   • уведомления: лайк комментария → автору комментария; ответ → автору
--     родительского комментария (kind 'comment_like' / 'reply')
-- Требует применённой 0027 (display_name) — на всякий случай переопределяем её ниже.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 0) Хелпер отображаемого имени (идемпотентно — на случай, если 0027 не применяли) ---
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

-- 1) Ответы на комментарии (один уровень) ----------------------
--    parent_id ссылается на корневой комментарий; on delete cascade —
--    удаление корня уносит ответы.
alter table public.post_comments
  add column if not exists parent_id uuid references public.post_comments (id) on delete cascade;
create index if not exists post_comments_parent_idx on public.post_comments (parent_id);

-- 2) Лайки комментариев (один на пару комментарий+пользователь) -
create table if not exists public.post_comment_likes (
  comment_id uuid        not null references public.post_comments (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.post_comment_likes enable row level security;

drop policy if exists post_comment_likes_select_all on public.post_comment_likes;
create policy post_comment_likes_select_all on public.post_comment_likes for select using (true);

drop policy if exists post_comment_likes_insert_own on public.post_comment_likes;
create policy post_comment_likes_insert_own on public.post_comment_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists post_comment_likes_delete_own on public.post_comment_likes;
create policy post_comment_likes_delete_own on public.post_comment_likes for delete
  using (auth.uid() = user_id);

-- 3) Допустимые типы уведомлений: + 'comment_like','reply' ------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('application','message','follow','vacancy','system','like','comment','comment_like','reply'));

-- 4) Триггер: лайк комментария → автору комментария -------------
create or replace function public.notify_on_comment_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_actor text;
begin
  select author_id into v_owner from public.post_comments where id = new.comment_id;
  if v_owner is null or v_owner = new.user_id then
    return new; -- комментарий не найден или лайк своего — пропускаем
  end if;
  v_actor := public.display_name(new.user_id);
  insert into public.notifications (user_id, actor_id, kind, title, body, link)
  values (v_owner, new.user_id, 'comment_like',
          coalesce(v_actor, 'Пользователь'),
          'Оценил(а) ваш комментарий',
          '/profile');
  return new;
end; $$;

drop trigger if exists post_comment_likes_notify on public.post_comment_likes;
create trigger post_comment_likes_notify after insert on public.post_comment_likes
  for each row execute function public.notify_on_comment_like();

-- 5) Триггер комментария: ответ vs комментарий к посту ----------
--    Переопределяем notify_on_post_comment (из 0028):
--    • parent_id задан → уведомляем автора РОДИТЕЛЬСКОГО комментария (kind 'reply')
--    • иначе → уведомляем автора ПОСТА (kind 'comment'), как раньше
create or replace function public.notify_on_post_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_actor text;
begin
  v_actor := public.display_name(new.author_id);
  if new.parent_id is not null then
    -- Ответ на комментарий — уведомляем автора родительского комментария.
    select author_id into v_target from public.post_comments where id = new.parent_id;
    if v_target is null or v_target = new.author_id then
      return new; -- родитель не найден или ответ самому себе — пропускаем
    end if;
    insert into public.notifications (user_id, actor_id, kind, title, body, link)
    values (v_target, new.author_id, 'reply',
            coalesce(v_actor, 'Пользователь'),
            'Ответил(а): «' || left(new.content, 80) || '»',
            '/profile');
  else
    -- Комментарий к посту — уведомляем автора поста.
    select author_id into v_target from public.posts where id = new.post_id;
    if v_target is null or v_target = new.author_id then
      return new; -- пост не найден или комментарий к своему посту — пропускаем
    end if;
    insert into public.notifications (user_id, actor_id, kind, title, body, link)
    values (v_target, new.author_id, 'comment',
            coalesce(v_actor, 'Пользователь'),
            'Прокомментировал(а): «' || left(new.content, 80) || '»',
            '/profile');
  end if;
  return new;
end; $$;

drop trigger if exists post_comments_notify on public.post_comments;
create trigger post_comments_notify after insert on public.post_comments
  for each row execute function public.notify_on_post_comment();
