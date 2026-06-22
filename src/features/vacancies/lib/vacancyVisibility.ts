import type { Vacancy } from '../model/types'

/**
 * Вакансия видна публично (соискателям в поиске, в профиле компании, в
 * рекомендациях и блоке «Сегодня для тебя») только если она активна.
 * Пауза / черновик / закрытая — скрыты везде, кроме раздела «Мои вакансии» у владельца.
 */
export function isPublicVacancy(v: Vacancy): boolean {
  return (v.status ?? 'active') === 'active'
}
