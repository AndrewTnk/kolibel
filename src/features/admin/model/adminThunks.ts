import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import type { AdminRole } from './types'

/**
 * Загружает роли текущего пользователя: админскую (admin_roles) и издателя
 * обновлений платформы (publisher_roles, миграция 0051 — гейт категории
 * «Update» в редакторе статей). Обе таблицы отдают свою строку по RLS.
 * При ошибке (таблица не создана / нет доступа) — считаем, что роли нет.
 */
export const loadAdminRole = createAsyncThunk<{ role: AdminRole | null; publisher: boolean }, void>(
  'admin/loadRole',
  async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const me = sessionData.session?.user?.id
    if (!me) return { role: null, publisher: false }
    const [roleRes, pubRes] = await Promise.all([
      supabase.from('admin_roles').select('role').eq('user_id', me).maybeSingle(),
      supabase.from('publisher_roles').select('profile_id').eq('profile_id', me).maybeSingle(),
    ])
    const role = roleRes.error ? null : ((roleRes.data?.role as AdminRole | undefined) ?? null)
    const publisher = pubRes.error ? false : !!pubRes.data
    return { role, publisher }
  },
)
