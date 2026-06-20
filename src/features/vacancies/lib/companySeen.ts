/**
 * Отметки «пользователь смотрел вакансии компании» — чтобы бейдж «+N новых
 * вакансий» исчезал после просмотра. Хранится в localStorage (карта companyId →
 * timestamp последнего просмотра). Считаем «новыми» вакансии за последнюю неделю,
 * выложенные ПОЗЖЕ последнего просмотра компании.
 */

const KEY = 'kolibel:companySeen'
const WEEK = 7 * 24 * 60 * 60 * 1000

export type SeenMap = Record<string, number>

export function loadCompanySeen(): SeenMap {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SeenMap) : {}
  } catch {
    return {}
  }
}

export function saveCompanySeen(map: SeenMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* no-op */
  }
}

/** Кол-во новых вакансий компании за неделю, ещё не просмотренных (postedAt > seenAt). */
export function newVacancyCount(
  companyId: string,
  vacancies: { companyId?: string; postedAt: number }[],
  seenAt: number,
): number {
  const weekAgo = Date.now() - WEEK
  let n = 0
  for (const v of vacancies) {
    if (v.companyId === companyId && v.postedAt >= weekAgo && v.postedAt > seenAt) n++
  }
  return n
}
