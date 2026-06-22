-- ============================================================
-- 0031_message_edit_delete.sql
-- Разрешаем автору редактировать и удалять СВОИ сообщения.
-- (В 0010 у messages были только select + insert политики.)
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- Автор может править своё сообщение (текст/вложение).
drop policy if exists messages_update_own on public.messages;
create policy messages_update_own on public.messages for update to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- Автор может удалить своё сообщение.
drop policy if exists messages_delete_own on public.messages;
create policy messages_delete_own on public.messages for delete to authenticated
  using (sender_id = auth.uid());

-- REPLICA IDENTITY FULL: чтобы realtime-событие DELETE доходило до собеседника
-- (RLS проверяется по old-строке, в которой нужен conversation_id) и содержало
-- conversation_id для удаления из стора. Для UPDATE/INSERT не требуется, но не мешает.
alter table public.messages replica identity full;
