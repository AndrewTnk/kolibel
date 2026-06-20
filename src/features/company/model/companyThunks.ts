import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import { rowToCompany, companyToRow, type CompanyRow } from '../lib/mapCompany'
import type { CompanyProfile } from './companyData'

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

/** Загрузка профиля компании текущего аккаунта. */
export const loadCompany = createAsyncThunk<CompanyProfile | null, void>(
  'company/load',
  async () => {
    const uid = await currentUserId()
    if (!uid) return null
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null
    return rowToCompany(data as CompanyRow)
  },
)

/** Сохранение профиля компании. */
export const saveCompany = createAsyncThunk<CompanyProfile, CompanyProfile>(
  'company/save',
  async (company) => {
    const uid = await currentUserId()
    if (!uid) throw new Error('Нет активной сессии')
    // Поля секций (миграция 0023) отбрасываем, если колонок ещё нет.
    let payload: Record<string, unknown> = companyToRow(company)
    let data: unknown = null
    let error: { message: string } | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      ;({ data, error } = await supabase
        .from('companies')
        .update(payload)
        .eq('id', uid)
        .select()
        .single())
      if (!error) break
      if (/tagline|directions|culture_values|gallery/.test(error.message)) {
        const { tagline, directions, culture_values, gallery, ...rest } = payload
        void tagline
        void directions
        void culture_values
        void gallery
        payload = rest
      } else break
    }
    if (error) throw new Error(error.message)
    return rowToCompany(data as CompanyRow)
  },
)
