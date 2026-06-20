-- ============================================================
-- 0014_delete_conversation.sql
-- RPC для удаления беседы участником. Каскад на conversation_participants
-- и messages (on delete cascade) удалит всё связанное.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

create or replace function public.delete_conversation(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Нет активной сессии';
  end if;
  -- Удалять может только участник беседы.
  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'Нет доступа к беседе';
  end if;
  delete from public.conversations where id = p_conversation_id;
end;
$$;
