import type { Company } from '../../network/model/types'

/** Подзаголовок карточки компании: «{отрасль} · {город}». */
export function companySubtitle(company: Pick<Company, 'field' | 'location'>): string {
  return [company.field, company.location].filter(Boolean).join(' · ') || 'Компания'
}
