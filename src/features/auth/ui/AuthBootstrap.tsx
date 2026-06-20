import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
import { bootstrapAuth } from '../model/authThunks.ts'
import { authActions } from '../model/authSlice'
import { mapSession } from '../lib/session'
import { setAccountAvatar, upsertAccount } from '../lib/accountsStore'
import { loadProfile } from '../../profile/model/profileThunks'

const CAPTURE_EVENTS = ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED', 'USER_UPDATED']

export function AuthBootstrap() {
  const dispatch = useAppDispatch()
  const userId = useAppSelector((s) => s.auth.user?.id)
  const avatar = useAppSelector((s) => s.profile.resume.avatar)

  useEffect(() => {
    // Стартовое восстановление сессии (ставит флаг bootstrapped)
    void dispatch(bootstrapAuth())

    // Синхронизация Redux при любых изменениях сессии (вход/выход/refresh токена, в т.ч. в другой вкладке)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      dispatch(authActions.setSession(mapSession(session)))

      // Запоминаем аккаунт для быстрого переключения (с актуальными токенами)
      if (session?.user && CAPTURE_EVENTS.includes(event)) {
        const u = session.user
        const meta = (u.user_metadata ?? {}) as Record<string, unknown>
        const name =
          (typeof meta.full_name === 'string' && meta.full_name) ||
          (typeof meta.name === 'string' && meta.name) ||
          (u.email ? u.email.split('@')[0] : 'Аккаунт')
        upsertAccount({
          id: u.id,
          email: u.email ?? '',
          name,
          accountType: meta.account_type === 'company' ? 'company' : 'user',
          refreshToken: session.refresh_token,
          accessToken: session.access_token,
        })
      }

      // При входе/восстановлении сессии подтягиваем профиль из БД
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        void dispatch(loadProfile())
      }
    })

    return () => subscription.unsubscribe()
  }, [dispatch])

  // Когда подгрузился профиль — сохраняем аватар активного аккаунта в реестр
  useEffect(() => {
    if (userId) setAccountAvatar(userId, avatar)
  }, [userId, avatar])

  return null
}
