-- ============================================================
-- 0030_participants_realtime.sql
-- Realtime-галочки прочтения: публикуем conversation_participants в
-- supabase_realtime, чтобы при обновлении last_read_at собеседника отправитель
-- получал событие UPDATE и сразу видел «прочитано» (раньше — только при
-- перезагрузке списка бесед).
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_participants'
  ) then
    alter publication supabase_realtime add table public.conversation_participants;
  end if;
end $$;
