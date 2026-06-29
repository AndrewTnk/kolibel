import type { EmploymentType, Vacancy, VacancyStatus, WorkFormat, WorkSchedule } from '../model/types'

/** Строка таблицы public.vacancies. */
export type VacancyRow = {
  id: string
  company_id: string | null
  status: string | null
  company: string | null
  company_about: string | null
  title: string | null
  city: string | null
  work_format: string | null
  employment_type: string | null
  schedule: string | null
  experience_from: number | null
  experience_to: number | null
  salary_from: number | null
  salary_to: number | null
  currency: string | null
  skills: string[] | null
  description: string | null
  requirements: string[] | null
  conditions: string[] | null
  contact_email: string | null
  contact_telegram: string | null
  views: number | null
  created_at: string
}

/** Поля для вставки новой вакансии (без id/служебных). */
export type VacancyInsert = {
  company_id: string
  status?: VacancyStatus
  company: string
  company_about: string
  title: string
  city: string
  work_format: string
  employment_type: string
  schedule?: string | null
  experience_from: number | null
  experience_to: number | null
  salary_from: number | null
  salary_to: number | null
  currency: string
  skills: string[]
  description: string
  requirements: string[]
  conditions: string[]
  contact_email: string
  contact_telegram: string | null
}

export function rowToVacancy(row: VacancyRow): Vacancy {
  return {
    id: row.id,
    companyId: row.company_id ?? undefined,
    status: (row.status ?? 'active') as VacancyStatus,
    title: row.title ?? '',
    company: row.company ?? '',
    companyAbout: row.company_about ?? '',
    city: row.city ?? '',
    workFormats: ((row.work_format ?? 'office').split(',').filter(Boolean) as WorkFormat[]),
    employmentTypes: ((row.employment_type ?? 'full').split(',').filter(Boolean) as EmploymentType[]),
    schedule: (row.schedule ?? undefined) as WorkSchedule | undefined,
    experienceFrom: row.experience_from ?? undefined,
    experienceTo: row.experience_to ?? undefined,
    salaryFrom: row.salary_from ?? undefined,
    salaryTo: row.salary_to ?? undefined,
    currency: row.currency ?? '₽',
    skills: row.skills ?? [],
    description: row.description ?? '',
    requirements: row.requirements ?? [],
    conditions: row.conditions ?? [],
    contactEmail: row.contact_email ?? '',
    contactTelegram: row.contact_telegram ?? undefined,
    postedAt: new Date(row.created_at).getTime(),
    views: row.views ?? 0,
    applicants: [],
  }
}
