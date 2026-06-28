import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import type { AdminRole } from './types'

/**
 * Загружает роль текущего пользователя в админ-панели.
 * Читает свою строку из admin_roles напрямую (RLS разрешает select своей строки).
 * Возвращает null, если роли нет.
 */
export const loadAdminRole = createAsyncThunk<AdminRole | null, void>('admin/loadRole', async () => {
  const { data: sessionData } = await supabase.auth.getSession()
  const me = sessionData.session?.user?.id
  if (!me) return null
  const { data, error } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', me)
    .maybeSingle()
  if (error) {
    // Таблица ещё не создана / нет доступа — считаем, что роли нет.
    return null
  }
  const role = (data?.role as AdminRole | undefined) ?? null
  return role
})
