/**
 * Вовлечённость кандидата в компанию — «тёплый лид» (RPC get_candidate_engagement,
 * миграция 0049). Считается из реального поведения (подписка/комменты/реакции/заходы/
 * прошлые отклики), видна ТОЛЬКО компании (RPC отдаёт null, если вызывающий ≠ p_company).
 * Это честная замена «интересу»: сигнал из поступков, а не из кнопки.
 */

import { supabase } from '../../../shared/lib/supabase'

export type Warmth = 'hot' | 'known' | 'cold'

export type CandidateEngagement = {
  warmth: Warmth
  isFollower: boolean
  followedAt: string | null
  comments: number
  reactions: number
  pageViews: number
  pastApplications: number
}

export async function fetchCandidateEngagement(
  candidateId: string,
  companyId: string,
): Promise<CandidateEngagement | null> {
  const { data, error } = await supabase.rpc('get_candidate_engagement', {
    p_candidate: candidateId,
    p_company: companyId,
  })
  if (error) throw new Error(error.message)
  return (data as CandidateEngagement | null) ?? null
}
