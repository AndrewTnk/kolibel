-- ============================================================
-- 0003_account_type_on_signup.sql
-- Триггер регистрации теперь учитывает тип аккаунта (user/company),
-- переданный в метаданных при signUp.
-- Применить: Supabase Dashboard → SQL Editor → вставить → Run.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.raw_user_meta_data ->> 'account_type' = 'company' then 'company'
      else 'user'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
