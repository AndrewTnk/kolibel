import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import { resetStores } from '../../../app/store/resetStores'
import { mapSession } from '../lib/session'
import { getSavedAccounts, removeSavedAccount } from '../lib/accountsStore'
import { loadProfile } from '../../profile/model/profileThunks'
import type { AuthSession } from './types'

/** Переводит частые сообщения Supabase на русский. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Неверный email или пароль'
  if (m.includes('user already registered')) return 'Пользователь с таким email уже зарегистрирован'
  if (m.includes('email not confirmed')) return 'Email не подтверждён — проверьте почту'
  if (m.includes('password should be at least')) return 'Пароль слишком короткий'
  if (m.includes('is invalid')) return 'Некорректный email'
  if (m.includes('signups are disabled') || m.includes('signup is disabled'))
    return 'Регистрация по email отключена в настройках Supabase'
  if (m.includes('rate limit')) return 'Слишком много попыток — подождите немного'
  if (m.includes('for security purposes')) return 'Слишком часто — подождите минуту и повторите'
  return message
}

/** Восстановление сессии при загрузке приложения. */
export const bootstrapAuth = createAsyncThunk<AuthSession | null, void>(
  'auth/bootstrap',
  async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw new Error(translateAuthError(error.message))
    return mapSession(data.session)
  },
)

/** Вход по email + паролю. */
export const signIn = createAsyncThunk<
  AuthSession | null,
  { email: string; password: string }
>('auth/signIn', async ({ email, password }, { dispatch }) => {
  // Чистим данные предыдущего аккаунта, чтобы они не мелькали под новым входом.
  dispatch(resetStores())
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(translateAuthError(error.message))
  return mapSession(data.session)
})

/** Регистрация. Имя/название и тип аккаунта сохраняются в user_metadata. */
export const signUp = createAsyncThunk<
  AuthSession | null,
  { email: string; password: string; fullName?: string; accountType?: 'user' | 'company' }
>('auth/signUp', async ({ email, password, fullName, accountType = 'user' }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        account_type: accountType,
        ...(fullName ? { full_name: fullName } : {}),
      },
    },
  })
  if (error) throw new Error(translateAuthError(error.message))
  // Если в Supabase включено подтверждение email — сессии не будет до подтверждения.
  if (!data.session) {
    throw new Error('Письмо для подтверждения отправлено на email. Подтвердите адрес и войдите.')
  }
  return mapSession(data.session)
})

/** Выход. */
export const signOut = createAsyncThunk<void, void>('auth/signOut', async (_, { dispatch }) => {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(translateAuthError(error.message))
  // Сбрасываем все пользовательские данные после выхода.
  dispatch(resetStores())
})

/**
 * Переключение на другой сохранённый аккаунт (без повторного ввода пароля).
 * Поднимаем его сессию через setSession; если токен устарел — убираем аккаунт
 * из реестра и просим войти заново.
 */
export const switchAccount = createAsyncThunk<string, string>(
  'auth/switch',
  async (accountId, { dispatch }) => {
    const acc = getSavedAccounts().find((a) => a.id === accountId)
    if (!acc) throw new Error('Аккаунт не найден')
    // Сбрасываем данные текущего аккаунта до подъёма новой сессии, чтобы
    // на секунду не показывались данные предыдущего пользователя.
    dispatch(resetStores())
    const { data, error } = await supabase.auth.setSession({
      access_token: acc.accessToken,
      refresh_token: acc.refreshToken,
    })
    if (error || !data.session) {
      removeSavedAccount(accountId)
      throw new Error('Сессия аккаунта устарела — войдите заново')
    }
    // Обновляем стор и профиль под новый аккаунт
    await dispatch(bootstrapAuth())
    await dispatch(loadProfile())
    return accountId
  },
)
