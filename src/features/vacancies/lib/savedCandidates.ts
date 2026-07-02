/**
 * Избранные кандидаты компании — серверный ПРИВАТНЫЙ шорт-лист (таблица
 * saved_candidates, миграция 0049). Ключ — profile_id кандидата (а не id отклика),
 * поэтому «звёздочка» относится к человеку и работает на любой его карточке,
 * не только среди откликнувшихся. Кандидат о сохранении не знает (RLS приватна).
 * Заменяет прежний localStorage-вариант (applicantFavorites.ts).
 */

import { supabase } from '../../../shared/lib/supabase'

/** Множество profile_id кандидатов, сохранённых текущей компанией. */
export async function fetchSavedCandidates(): Promise<Set<string>> {
  const { data: sess } = await supabase.auth.getSession()
  const uid = sess.session?.user?.id
  if (!uid) return new Set()
  const { data, error } = await supabase
    .from('saved_candidates')
    .select('candidate_id')
    .eq('company_id', uid)
  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((r) => (r as { candidate_id: string }).candidate_id))
}

/** Добавить/убрать кандидата из избранного. */
export async function setSavedCandidate(candidateId: string, present: boolean): Promise<void> {
  const { data: sess } = await supabase.auth.getSession()
  const uid = sess.session?.user?.id
  if (!uid) return
  if (present) {
    const { error } = await supabase
      .from('saved_candidates')
      .upsert({ company_id: uid, candidate_id: candidateId })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('saved_candidates')
      .delete()
      .eq('company_id', uid)
      .eq('candidate_id', candidateId)
    if (error) throw new Error(error.message)
  }
}
