-- ============================================================
-- 0016_post_author_avatar.sql
-- Денормализуем аватар и тип автора в постах и комментариях
-- (как уже денормализовано author_name) — чтобы показывать настоящее
-- фото профиля и правильную форму аватара (круг — юзер, квадрат — компания).
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

alter table public.posts
  add column if not exists author_avatar text,
  add column if not exists author_kind text;

alter table public.post_comments
  add column if not exists author_avatar text,
  add column if not exists author_kind text;
