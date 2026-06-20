import { computeMatch, personToMatchProfile } from '../../vacancies/lib/useVacancyMatch'
import type { NetworkPerson } from '../../network/model/types'
import type { Vacancy } from '../../vacancies/model/types'

/**
 * Лучший матч кандидата (человека из сети) по открытым вакансиям компании.
 * Возвращает максимальный % среди вакансий, либо null — если матчить не с чем
 * (нет вакансий) или не по чему (пустой профиль кандидата). Реальный лексический
 * скоринг через общий движок (`computeMatch`).
 */
export function candidateBestMatch(person: NetworkPerson, vacancies: Vacancy[]): number | null {
  const profile = personToMatchProfile(person)
  let best: number | null = null
  for (const v of vacancies) {
    const m = computeMatch(v, profile)
    if (m.score != null && (best == null || m.score > best)) best = m.score
  }
  return best
}
