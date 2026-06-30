-- ============================================================
-- 0045_proxy_media_urls.sql
-- Перевод сохранённых ссылок на файлы Storage с прямого домена
-- `https://oobutqfpxykxzrilhokn.supabase.co` на относительный путь `/sb`,
-- который проксируется через Vercel (rewrite в vercel.json) и доступен из РФ
-- без VPN. Прямой домен `*.supabase.co` за Cloudflare троттлится в России →
-- картинки/аватары не грузились.
--
-- Новые загрузки уже сохраняются с `/sb` (клиент Supabase ходит через прокси),
-- эта миграция чинит СТАРЫЕ строки.
--
-- Идемпотентна: после переписывания `like`-условия больше не совпадают, повторный
-- запуск ничего не делает. Относительный путь `/sb/...` доменно-независим — работает
-- и на vercel.app, и на будущем кастомном домене, и в dev (прокси в vite.config.ts).
--
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- Текстовые колонки со ссылками ------------------------------------------------
update public.profiles
  set avatar_url = replace(avatar_url, 'https://oobutqfpxykxzrilhokn.supabase.co', '/sb')
  where avatar_url like 'https://oobutqfpxykxzrilhokn.supabase.co%';

update public.profiles
  set banner_url = replace(banner_url, 'https://oobutqfpxykxzrilhokn.supabase.co', '/sb')
  where banner_url like 'https://oobutqfpxykxzrilhokn.supabase.co%';

update public.companies
  set logo_url = replace(logo_url, 'https://oobutqfpxykxzrilhokn.supabase.co', '/sb')
  where logo_url like 'https://oobutqfpxykxzrilhokn.supabase.co%';

update public.companies
  set banner_url = replace(banner_url, 'https://oobutqfpxykxzrilhokn.supabase.co', '/sb')
  where banner_url like 'https://oobutqfpxykxzrilhokn.supabase.co%';

update public.companies
  set avatar_url = replace(avatar_url, 'https://oobutqfpxykxzrilhokn.supabase.co', '/sb')
  where avatar_url like 'https://oobutqfpxykxzrilhokn.supabase.co%';

update public.posts
  set author_avatar = replace(author_avatar, 'https://oobutqfpxykxzrilhokn.supabase.co', '/sb')
  where author_avatar like 'https://oobutqfpxykxzrilhokn.supabase.co%';

update public.post_comments
  set author_avatar = replace(author_avatar, 'https://oobutqfpxykxzrilhokn.supabase.co', '/sb')
  where author_avatar like 'https://oobutqfpxykxzrilhokn.supabase.co%';

update public.articles
  set cover_url = replace(cover_url, 'https://oobutqfpxykxzrilhokn.supabase.co', '/sb')
  where cover_url like 'https://oobutqfpxykxzrilhokn.supabase.co%';

-- JSONB-колонки (ссылки внутри структур) --------------------------------------
-- Переписываем через текстовое представление целиком — ловит все url в массиве/объекте.

-- Медиа в постах (блоки image/video/document)
update public.posts
  set content = replace(content::text, 'https://oobutqfpxykxzrilhokn.supabase.co', '/sb')::jsonb
  where content::text like '%oobutqfpxykxzrilhokn.supabase.co%';

-- Галерея «Жизнь в компании» ([{id,url}])
update public.companies
  set gallery = replace(gallery::text, 'https://oobutqfpxykxzrilhokn.supabase.co', '/sb')::jsonb
  where gallery::text like '%oobutqfpxykxzrilhokn.supabase.co%';

-- Вложения в сообщениях чата (фото/видео/документ)
update public.messages
  set attach = replace(attach::text, 'https://oobutqfpxykxzrilhokn.supabase.co', '/sb')::jsonb
  where attach is not null
    and attach::text like '%oobutqfpxykxzrilhokn.supabase.co%';
