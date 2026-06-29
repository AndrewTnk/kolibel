import { supabase } from '../../../shared/lib/supabase'
import { rowToResume, type ProfileRow } from './mapProfile'
import { rowToCompany, type CompanyRow } from '../../company/lib/mapCompany'
import type { Resume } from '../model/types'
import type { CompanyProfile } from '../../company/model/companyData'

/** Публичный профиль другого аккаунта (read-only). */
export type PublicProfile =
  | { kind: 'user'; id: string; resume: Resume; isPublic: boolean; blocked: boolean }
  | { kind: 'company'; id: string; company: CompanyProfile; resume: Resume; isPublic: boolean; blocked: boolean }

/** Загрузить чужой профиль по id. Возвращает null, если профиль не найден. */
export async function fetchPublicProfile(id: string): Promise<PublicProfile | null> {
  const { data: prof, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!prof) return null

  const row = prof as ProfileRow
  const resume = rowToResume(row)
  const isPublic = row.is_public ?? true
  const blocked = row.status === 'blocked'

  if (row.account_type === 'company') {
    const { data: comp, error: cErr } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (cErr) throw new Error(cErr.message)
    if (comp) return { kind: 'company', id, company: rowToCompany(comp as CompanyRow), resume, isPublic, blocked }
  }

  return { kind: 'user', id, resume, isPublic, blocked }
}
