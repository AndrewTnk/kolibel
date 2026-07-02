import type {
  ContactLink,
  EducationItem,
  ExperienceItem,
  Highlight,
  JobStatus,
  LanguageItem,
  Resume,
} from '../model/types'
import { normalizeAchievements } from '../../../shared/lib/normalizeAchievements'

/** Строка таблицы public.profiles (как возвращает Supabase). */
export type ProfileRow = {
  id: string
  full_name: string | null
  job_title: string | null
  headline: string | null
  location: string | null
  country: string | null
  work_format: string | null
  available: boolean | null
  job_status: JobStatus | null
  avatar_url: string | null
  banner_url: string | null
  about: string | null
  skills: string[] | null
  highlights: Highlight[] | null
  experience: ExperienceItem[] | null
  education: EducationItem[] | null
  languages: LanguageItem[] | null
  contacts: ContactLink[] | null
  account_type: 'user' | 'company' | null
  onboarded: boolean | null
  is_public: boolean | null
  show_activity: boolean | null
  last_seen_at: string | null
  status: 'active' | 'blocked' | 'deleted' | null
  block_reason: string | null
  block_message: string | null
}

/**
 * Нормализует статус из БД. Старые записи могли иметь kind 'employed' — это
 * больше не статус поиска, поэтому переводим в 'not_seeking', а название
 * компании/логотип сохраняем (теперь это просто «текущая компания»).
 */
function normalizeJobStatus(raw: JobStatus | null): JobStatus {
  if (!raw) return { kind: 'seeking' }
  const kind = raw.kind as JobStatus['kind'] | 'employed'
  if (kind === 'employed') return { ...raw, kind: 'not_seeking' }
  if (kind === 'seeking' || kind === 'open' || kind === 'not_seeking') return raw
  return { ...raw, kind: 'seeking' }
}

export function computeInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'U'
  )
}

/** Строка БД → модель Resume для UI. */
export function rowToResume(row: ProfileRow): Resume {
  const fullName = row.full_name ?? ''
  return {
    fullName,
    jobTitle: row.job_title ?? '',
    headline: row.headline ?? '',
    location: row.location ?? '',
    country: row.country ?? undefined,
    workFormat: row.work_format ?? '',
    available: row.available ?? true,
    isOnline: true, // онлайн-статус берём из presence-слайса, не из БД
    isPublic: row.is_public ?? true,
    showActivity: row.show_activity ?? true,
    lastSeenAt: row.last_seen_at ?? undefined,
    jobStatus: normalizeJobStatus(row.job_status),
    avatarInitials: computeInitials(fullName),
    avatar: row.avatar_url ?? undefined,
    banner: row.banner_url ?? undefined,
    about: row.about ?? '',
    highlights: row.highlights ?? [],
    skills: row.skills ?? [],
    // Достижения: старые данные — массив строк, приводим к markdown-строке.
    experience: (row.experience ?? []).map((e) => ({
      ...e,
      achievements: normalizeAchievements((e as { achievements?: unknown }).achievements),
    })),
    education: row.education ?? [],
    languages: row.languages ?? [],
    contacts: row.contacts ?? [],
  }
}

/** Модель Resume → поля для UPDATE в БД (без id/служебных полей). */
export function resumeToRow(resume: Resume): Partial<ProfileRow> {
  return {
    full_name: resume.fullName,
    job_title: resume.jobTitle,
    headline: resume.headline,
    location: resume.location,
    country: resume.country ?? null,
    work_format: resume.workFormat,
    available: resume.available,
    job_status: resume.jobStatus,
    avatar_url: resume.avatar ?? null,
    banner_url: resume.banner ?? null,
    about: resume.about,
    skills: resume.skills,
    highlights: resume.highlights,
    experience: resume.experience,
    education: resume.education,
    languages: resume.languages,
    contacts: resume.contacts,
  }
}
