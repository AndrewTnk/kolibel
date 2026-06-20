-- ============================================================
-- 0019_chat_features.sql
-- Расширение чата под Telegram-редизайн: ответы (reply), вложения (attach),
-- реакции (reactions) на сообщениях + закрепление/без звука у участника.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

-- 1) Новые поля сообщений -------------------------------------
--    reply_to  — снимок сообщения, на которое отвечаем {author,text,sender}
--    attach    — вложение {title, subtitle, kind: photo|file|loc|contact|vacancy|voice}
--    reactions — массив [{em:'👍', users:['uid', ...]}]
alter table public.messages
  add column if not exists reply_to  jsonb,
  add column if not exists attach    jsonb,
  add column if not exists reactions jsonb not null default '[]'::jsonb;

-- 2) Закрепление / без звука у участника -----------------------
--    (обновляет участник у своей строки — покрывается participants_update_own из 0010)
alter table public.conversation_participants
  add column if not exists pinned boolean not null default false,
  add column if not exists muted  boolean not null default false;

-- 3) RPC: записать реакции сообщения --------------------------
--    Клиент считает новый массив реакций (он знает текущие + себя), RPC проверяет,
--    что вызывающий — участник беседы, и пишет массив. (UPDATE на messages напрямую
--    закрыт RLS, поэтому через security definer.)
create or replace function public.set_message_reactions(p_message_id uuid, p_reactions jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv uuid;
begin
  if auth.uid() is null then
    raise exception 'Нет активной сессии';
  end if;
  select conversation_id into v_conv from public.messages where id = p_message_id;
  if v_conv is null then
    raise exception 'Сообщение не найдено';
  end if;
  if not public.is_conversation_participant(v_conv) then
    raise exception 'Нет доступа';
  end if;
  update public.messages
    set reactions = coalesce(p_reactions, '[]'::jsonb)
    where id = p_message_id;
end;
$$;
