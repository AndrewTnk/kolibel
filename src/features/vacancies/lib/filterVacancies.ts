import type { Vacancy, VacancyFilters } from '../model/types'
import { isPublicVacancy } from './vacancyVisibility'

const day = 1000 * 60 * 60 * 24

function postedCutoff(within: VacancyFilters['postedWithin']) {
  if (within === '3d') return Date.now() - 3 * day
  if (within === '7d') return Date.now() - 7 * day
  if (within === '30d') return Date.now() - 30 * day
  return 0
}

function parseNum(s: string) {
  const t = s.trim()
  if (!t) return null
  const n = Number(t.replace(/\s/g, ''))
  return Number.isFinite(n) ? n : null
}

export function filterVacancies(items: Vacancy[], filters: VacancyFilters): Vacancy[] {
  const q = filters.query.trim().toLowerCase()
  const city = filters.city.trim().toLowerCase()
  const company = filters.company.trim().toLowerCase()
  const min = parseNum(filters.salaryMin)
  const max = parseNum(filters.salaryMax)
  const cutoff = postedCutoff(filters.postedWithin)

  let list = items.filter((v) => {
    // Только активные — пауза/черновик/закрытая в публичную выдачу не попадают.
    if (!isPublicVacancy(v)) return false
    if (q) {
      const hay = `${v.title} ${v.company} ${v.description} ${v.skills.join(' ')}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (city && !v.city.toLowerCase().includes(city)) return false
    if (company && !v.company.toLowerCase().includes(company)) return false
    if (filters.workFormat !== 'all' && !v.workFormats.includes(filters.workFormat)) return false
    if (filters.employmentType !== 'all' && !v.employmentTypes.includes(filters.employmentType)) return false
    if (filters.skills.length && !filters.skills.every((s) => v.skills.includes(s))) return false
    if (cutoff && v.postedAt < cutoff) return false

    const vMin = v.salaryFrom ?? 0
    const vMax = v.salaryTo ?? v.salaryFrom ?? 0
    if (min != null && vMax > 0 && vMax < min) return false
    if (max != null && vMin > 0 && vMin > max) return false

    return true
  })

  if (filters.sort === 'salary') {
    list = [...list].sort((a, b) => (b.salaryTo ?? b.salaryFrom ?? 0) - (a.salaryTo ?? a.salaryFrom ?? 0))
  } else if (filters.sort === 'date') {
    list = [...list].sort((a, b) => b.postedAt - a.postedAt)
  } else {
    list = [...list].sort((a, b) => {
      const score = (v: Vacancy) =>
        (filters.query && v.title.toLowerCase().includes(filters.query.toLowerCase()) ? 2 : 0) +
        (filters.skills.filter((s) => v.skills.includes(s)).length)
      return score(b) - score(a) || b.postedAt - a.postedAt
    })
  }

  return list
}
