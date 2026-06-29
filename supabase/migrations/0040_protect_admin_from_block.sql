-- ============================================================
-- 0040_protect_admin_from_block.sql
-- Защита ролей от блокировки через админ-панель:
--   • администратора (фаундера) нельзя заблокировать/удалить НИКОМУ;
--   • модератора может заблокировать только администратор
--     (модераторы не блокируют друг друга и тем более админа).
-- Действует и на прямую кнопку «Заблокировать», и на «Принять меры» по жалобе
-- (admin_resolve_report вызывает admin_set_account_status).
-- Применять ПОСЛЕ 0039. Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

create or replace function public.admin_set_account_status(
  p_id uuid, p_status text, p_reason text default '', p_message text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_target_role text;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('active', 'blocked', 'deleted') then raise exception 'bad status'; end if;

  select role into v_target_role from public.admin_roles where user_id = p_id;

  if p_status in ('blocked', 'deleted') then
    -- Администратора заблокировать/удалить через панель нельзя (защита фаундера).
    if v_target_role = 'admin' then
      raise exception 'Администратора нельзя заблокировать' using errcode = '42501';
    end if;
    -- Модератора может тронуть только администратор.
    if v_target_role = 'moderator' and not public.is_admin() then
      raise exception 'Блокировать модератора может только администратор' using errcode = '42501';
    end if;
  end if;

  if p_status = 'blocked' then
    update public.profiles
      set status = 'blocked',
          block_reason = coalesce(p_reason, ''),
          block_message = coalesce(p_message, '')
      where id = p_id;
  else
    update public.profiles
      set status = p_status, block_reason = '', block_message = ''
      where id = p_id;
  end if;
end; $$;
