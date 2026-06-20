-- ============================================================
-- 0009_storage.sql
-- Хранилище файлов (Supabase Storage): один публичный bucket `media`.
-- Структура путей: <uid>/<category>/<file>
--   например  3f9a…/avatar/1717-ab12.png
--             3f9a…/posts/1717-cd34.jpg
-- Читать может кто угодно (публичный bucket), писать/менять/удалять —
-- только владелец внутри своей папки (первый сегмент пути = его uid).
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Bucket -----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- 2) RLS-политики на storage.objects ---------------------------
-- (RLS на storage.objects включён Supabase по умолчанию.)

-- Публичное чтение всех объектов bucket'а media
drop policy if exists "media_read_public" on storage.objects;
create policy "media_read_public"
  on storage.objects for select
  using (bucket_id = 'media');

-- Загрузка только в свою папку (<uid>/…)
drop policy if exists "media_insert_own" on storage.objects;
create policy "media_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Обновление только своих файлов
drop policy if exists "media_update_own" on storage.objects;
create policy "media_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Удаление только своих файлов
drop policy if exists "media_delete_own" on storage.objects;
create policy "media_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
