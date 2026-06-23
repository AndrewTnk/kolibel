import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
import { bootstrapAuth } from '../model/authThunks.ts'
import { authActions } from '../model/authSlice'
import { mapSession } from '../lib/session'
import { setAccountIdentity, upsertAccount } from '../lib/accountsStore'
import { loadProfile } from '../../profile/model/profileThunks'
import { loadMyApplications } from '../../vacancies/model/vacancyThunks'
import { loadBlocks } from '../../blocks/model/blocksThunks'

const CAPTURE_EVENTS = ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED', 'USER_UPDATED']

export function AuthBootstrap() {
  const dispatch = useAppDispatch()
  const userId = useAppSelector((s) => s.auth.user?.id)
  const accountType = useAppSelector((s) => s.account.type)
  const profileLoaded = useAppSelector((s) => s.profile.loaded)
  const companyLoaded = useAppSelector((s) => s.company.loaded)
  const resumeName = useAppSelector((s) => s.profile.resume.fullName)
  const resumeAvatar = useAppSelector((s) => s.profile.resume.avatar)
  const companyName = useAppSelector((s) => s.company.profile.name)
  const companyLogo = useAppSelector((s) => s.company.profile.logo)
  const companyAvatar = useAppSelector((s) => s.company.profile.avatar)

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
        // Сразу грузим id вакансий, на которые уже откликнулись — чтобы статус
        // «Откликнулся» был корректен везде (главная/рекомендации), а не только
        // после захода на /vacancies (иначе можно повторно открыть отклик).
        void dispatch(loadMyApplications())
        // Чёрный список (для скрытия в поиске/рекомендациях/чате).
        void dispatch(loadBlocks())
      }
    })

    return () => subscription.unsubscribe()
  }, [dispatch])

  // Когда подгрузился профиль — сохраняем актуальные имя+фото активного аккаунта
  // в реестр (для компании — из companies.name/logo, для юзера — из резюме),
  // чтобы в меню переключения не-текущий аккаунт показывался правильно.
  // ⚠️ Пишем ТОЛЬКО когда профиль реально загружен (`loaded`) — иначе при создании
  // второго аккаунта (signUp не делает resetStores) в реестр попало бы фото ещё
  // не сменившегося профиля первого аккаунта (баг «чужое фото у нового аккаунта»).
  useEffect(() => {
    if (!userId) return
    const isCompany = accountType === 'company'
    const loaded = isCompany ? companyLoaded : profileLoaded
    if (!loaded) return
    setAccountIdentity(userId, {
      name: isCompany ? companyName : resumeName,
      avatar: isCompany ? companyLogo || companyAvatar : resumeAvatar,
    })
  }, [
    userId,
    accountType,
    profileLoaded,
    companyLoaded,
    resumeName,
    resumeAvatar,
    companyName,
    companyLogo,
    companyAvatar,
  ])

  return null
}
