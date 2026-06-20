import { supabase } from '../../../shared/lib/supabase'

/** Сотрудник компании (профиль, указавший компанию местом работы). */
export type CompanyEmployee = {
  id: string
  name: string
  role: string
  initials: string
  avatar?: string
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '—'
  )
}

/**
 * Сотрудники компании = профили, у которых `job_status.company` совпадает с
 * названием компании (тот же признак, что даёт авто-бейдж работодателя).
 * Реляционной фичи сотрудников нет — это эвристика по тексту места работы.
 */
export async function fetchCompanyEmployees(companyName: string): Promise<CompanyEmployee[]> {
  const name = companyName.trim()
  if (!name) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, job_title, avatar_url, job_status')
    .filter('job_status->>company', 'ilike', name)
    .limit(60)
  if (error) return []
  return (data ?? []).map((r) => {
    const fullName = (r.full_name as string) || 'Без имени'
    return {
      id: r.id as string,
      name: fullName,
      role: (r.job_title as string) || 'Сотрудник',
      initials: initials(fullName),
      avatar: (r.avatar_url as string) || undefined,
    }
  })
}
