import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import type { RootState } from '../../../app/store/store'
import type { Analytics } from './types'

/** Грузит аналитику аккаунта (профиль или компания) через RPC.
 *  Принимает uid явно, чтобы корректно перезагружаться при смене аккаунта. */
export const loadAnalytics = createAsyncThunk<Analytics | null, string>(
  'analytics/load',
  async (uid) => {
    if (!uid) return null
    const { data, error } = await supabase.rpc('get_profile_analytics', { p_profile_id: uid })
    if (error) throw new Error(error.message)
    return (data as Analytics | null) ?? null
  },
  {
    // Не дёргаем повторно, если уже грузим или данные уже за этого пользователя.
    condition: (uid, { getState }) => {
      const a = (getState() as RootState).analytics
      if (a.status === 'loading') return false
      if (a.userId === uid && a.status === 'ready') return false
      return true
    },
  },
)
