export type WorkFormat = 'remote' | 'hybrid' | 'office'
export type EmploymentType = 'full' | 'part' | 'contract' | 'internship'
export type PostedWithin = 'any' | '3d' | '7d' | '30d'
export type VacancySort = 'date' | 'salary' | 'relevance'

/** Стадия отклика в ATS-воронке (управляет владелец вакансии).
 *  'saved' — legacy (старый «Сохранённые»); в новом UI не используется. */
export type ApplicationStatus = 'new' | 'contacted' | 'interview' | 'offer' | 'saved' | 'rejected'

/** Статус вакансии в разделе «Мои вакансии». */
export type VacancyStatus = 'active' | 'paused' | 'draft' | 'closed'

/** Папка вакансий (HR группирует свои вакансии). */
export type VacancyFolder = {
  id: string
  name: string
  color: string
  /** id вакансий в папке. */
  vacIds: string[]
}

/** Итоговый статус отклика глазами соискателя (раздел «Мои отклики»). */
export type MyApplicationStatus = 'sent' | 'rejected' | 'closed'

/** Отклик текущего пользователя (для виджета/модалки «Мои отклики»). */
export type MyApplication = {
  /** id записи отклика */
  id: string
  vacancyId: string
  vacancyTitle: string
  company: string
  companyInitials: string
  /** Логотип компании (живой, из companies). */
  companyLogo?: string
  status: MyApplicationStatus
  appliedAt: number
}

/** Отклик кандидата на вакансию */
export type Applicant = {
  id: string
  /** id пользователя-кандидата (для старта переписки) */
  userId: string
  /** Стадия в воронке (управляет владелец вакансии) */
  status: ApplicationStatus
  name: string
  jobTitle: string
  avatarInitials: string
  /** Фото профиля кандидата */
  avatar?: string
  /** Текущая компания кандидата */
  company?: string
  /** Лого работодателя кандидата (бейдж рядом с именем) */
  companyLogo?: string
  appliedAt: number
  email: string
  telegram?: string
  note?: string
  /** Данные мини-резюме кандидата (для просмотра HR) */
  location?: string
  about?: string
  skills?: string[]
  experience?: { company: string; role: string; period: string }[]
}

export type Vacancy = {
  id: string
  /** id аккаунта-владельца (null/undefined — пример без владельца) */
  companyId?: string
  /** Статус публикации (по умолчанию 'active'). */
  status?: VacancyStatus
  title: string
  company: string
  /** Лого компании-владельца (подтягивается из профиля при загрузке). */
  companyLogo?: string
  companyAbout: string
  city: string
  workFormats: WorkFormat[]
  employmentTypes: EmploymentType[]
  /** Требуемый опыт в годах (диапазон от/до). */
  experienceFrom?: number
  experienceTo?: number
  salaryFrom?: number
  salaryTo?: number
  currency: string
  skills: string[]
  description: string
  requirements: string[]
  conditions: string[]
  contactEmail: string
  contactTelegram?: string
  postedAt: number
  /** Просмотры вакансии (для раздела «Мои вакансии») */
  views?: number
  /** Отклики кандидатов */
  applicants?: Applicant[]
}

export type VacancyFilters = {
  query: string
  city: string
  workFormat: WorkFormat | 'all'
  employmentType: EmploymentType | 'all'
  salaryMin: string
  salaryMax: string
  company: string
  skills: string[]
  postedWithin: PostedWithin
  sort: VacancySort
}

export const defaultFilters: VacancyFilters = {
  query: '',
  city: '',
  workFormat: 'all',
  employmentType: 'all',
  salaryMin: '',
  salaryMax: '',
  company: '',
  skills: [],
  postedWithin: 'any',
  sort: 'date',
}
