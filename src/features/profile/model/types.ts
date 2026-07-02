export type ContactLink = {
  label: string
  value: string
  href: string
}

export type ExperienceItem = {
  id: string
  role: string
  company: string
  /** Логотип работодателя, если это зарегистрированная на сайте компания. */
  companyLogo?: string
  /** Готовая строка периода для отображения (собирается из полей ниже). */
  period: string
  /** Структурированный период (источник правды в редакторе). */
  startMonth?: number // 1–12
  startYear?: number
  endMonth?: number
  endYear?: number
  /** Работает по настоящее время. */
  current?: boolean
  /** @deprecated больше не редактируется (оставлено для обратной совместимости) */
  location?: string
  summary: string
  /** Ключевые достижения в формате markdown (редактор RichEditor). */
  achievements: string
  stack: string[]
}

export type EducationItem = {
  id: string
  institution: string
  degree: string
  period: string
}

export type LanguageItem = {
  name: string
  level: string
}

export type Highlight = {
  label: string
  value: string
}

export type JobStatus = {
  /** seeking — в поиске, open — рассматриваю предложения, not_seeking — не ищу */
  kind: 'seeking' | 'open' | 'not_seeking'
  /** Текущая компания (где человек работает) — не зависит от статуса поиска. */
  company?: string
  /** URL логотипа работодателя — если задан, рядом с именем показывается бейдж компании */
  companyLogo?: string
}

export type Resume = {
  fullName: string
  /** Короткое название должности под фото (например «Frontend-разработчик»). */
  jobTitle: string
  /** Полная строка заголовка для резюме. */
  headline: string
  location: string
  country?: string
  workFormat: string
  available: boolean
  isOnline: boolean
  /** Публичность профиля: виден в поиске/рекомендациях/по прямой ссылке. */
  isPublic: boolean
  /** Показывать ли «в сети»/«был(а) недавно» другим. */
  showActivity: boolean
  /** ISO-время последней активности (heartbeat presence). */
  lastSeenAt?: string
  jobStatus: JobStatus
  avatarInitials: string
  /** URL аватара. Если задан — показывается фото вместо инициалов. */
  avatar?: string
  /** Фоновое изображение-баннер профиля */
  banner?: string
  about: string
  highlights: Highlight[]
  skills: string[]
  experience: ExperienceItem[]
  education: EducationItem[]
  languages: LanguageItem[]
  contacts: ContactLink[]
}
