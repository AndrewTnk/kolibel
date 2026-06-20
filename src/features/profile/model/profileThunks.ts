import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import { accountActions } from '../../account/model/accountSlice'
import { loadCompany } from '../../company/model/companyThunks'
import { rowToResume, resumeToRow, type ProfileRow } from '../lib/mapProfile'
import { profileActions } from './profileSlice'
import type { Resume } from './types'

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

/** Загрузка профиля текущего пользователя из БД. */
export const loadProfile = createAsyncThunk<Resume | null, void>(
  'profile/load',
  async (_, { dispatch }) => {
    const uid = await currentUserId()
    if (!uid) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()
    if (error) throw new Error(error.message)
    const row = data as ProfileRow
    // Тип аккаунта (user/company) синхронизируем из БД
    if (row.account_type) dispatch(accountActions.setAccountType(row.account_type))
    // Флаг онбординга
    dispatch(profileActions.setOnboarded(row.onboarded ?? true))
    // Для компаний подтягиваем профиль компании
    if (row.account_type === 'company') void dispatch(loadCompany())
    return rowToResume(row)
  },
)

/** Сохранение профиля текущего пользователя в БД. */
export const saveProfile = createAsyncThunk<Resume, Resume>(
  'profile/save',
  async (resume) => {
    const uid = await currentUserId()
    if (!uid) throw new Error('Нет активной сессии')
    const { data, error } = await supabase
      .from('profiles')
      .update(resumeToRow(resume))
      .eq('id', uid)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return rowToResume(data as ProfileRow)
  },
)

/** Отметить онбординг пройденным. */
export const completeOnboarding = createAsyncThunk<void, void>(
  'profile/completeOnboarding',
  async () => {
    const uid = await currentUserId()
    if (!uid) throw new Error('Нет активной сессии')
    const { error } = await supabase.from('profiles').update({ onboarded: true }).eq('id', uid)
    if (error) throw new Error(error.message)
  },
)
