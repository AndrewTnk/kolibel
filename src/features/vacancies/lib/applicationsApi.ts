import { supabase } from '../../../shared/lib/supabase'
import type { Applicant, ApplicationStatus, MyApplication } from '../model/types'

type EmbeddedProfile = {
  full_name: string | null
  job_title: string | null
  location: string | null
  about: string | null
  avatar_url: string | null
  job_status: { company?: string; companyLogo?: string } | null
  skills: string[] | null
  experience: { role?: string; company?: string; period?: string }[] | null
} | null

type ApplicationRow = {
  id: string
  vacancy_id: string
  applicant_id: string
  applicant_name: string | null
  applicant_title: string | null
  applicant_email: string | null
  note: string | null
  status: ApplicationStatus | null
  created_at: string
  profiles: EmbeddedProfile
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

function rowToApplicant(row: ApplicationRow): Applicant {
  const p = row.profiles
  // Имя/должность берём из АКТУАЛЬНОГО профиля (как фото/компания) — денормализованные
  // applicant_name/applicant_title (снимок на момент отклика) лишь запасной вариант,
  // иначе у компании в откликах показывались старые данные после правки профиля.
  const name = p?.full_name?.trim() || row.applicant_name || 'Без имени'
  return {
    id: row.id,
    userId: row.applicant_id,
    status: row.status ?? 'new',
    name,
    jobTitle: p?.job_title?.trim() || row.applicant_title || '',
    avatarInitials: initials(name),
    avatar: p?.avatar_url ?? undefined,
    company: p?.job_status?.company ?? undefined,
    companyLogo: p?.job_status?.companyLogo ?? undefined,
    appliedAt: new Date(row.created_at).getTime(),
    email: row.applicant_email || '',
    note: row.note ?? undefined,
    location: p?.location ?? undefined,
    about: p?.about ?? undefined,
    skills: p?.skills ?? [],
    experience: (p?.experience ?? []).map((e) => ({
      company: e.company ?? '',
      role: e.role ?? '',
      period: e.period ?? '',
    })),
  }
}

const SELECT =
  '*, vacancies!inner(company_id), profiles(full_name, job_title, location, about, avatar_url, job_status, skills, experience)'

/** Обновить стадию отклика (доступно владельцу вакансии — по RLS). */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
): Promise<void> {
  const { error } = await supabase
    .from('vacancy_applications')
    .update({ status })
    .eq('id', applicationId)
  if (error) throw new Error(error.message)
}

/** Отклики на вакансии текущей компании, сгруппированные по vacancy_id. */
export async function fetchOwnerApplications(): Promise<Record<string, Applicant[]>> {
  const { data: sess } = await supabase.auth.getSession()
  const uid = sess.session?.user?.id
  if (!uid) return {}
  const { data, error } = await supabase
    .from('vacancy_applications')
    .select(SELECT)
    .eq('vacancies.company_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const grouped: Record<string, Applicant[]> = {}
  for (const row of (data as unknown as ApplicationRow[]) ?? []) {
    ;(grouped[row.vacancy_id] ??= []).push(rowToApplicant(row))
  }
  return grouped
}

type MyApplicationRow = {
  id: string
  vacancy_id: string
  status: ApplicationStatus | null
  created_at: string
  // Левый embed вакансии: null, если вакансию удалили (вакансия закрыта).
  // company/company_id — снимок на момент вакансии; живое имя/лого тянем из companies.
  vacancies: {
    title: string | null
    company: string | null
    company_id: string | null
    status: string | null
  } | null
}

/** Детальный список моих откликов для виджета/модалки «Мои отклики». */
export async function fetchMyApplicationsDetailed(): Promise<MyApplication[]> {
  const { data: sess } = await supabase.auth.getSession()
  const uid = sess.session?.user?.id
  if (!uid) return []
  const { data, error } = await supabase
    .from('vacancy_applications')
    .select('id, vacancy_id, status, created_at, vacancies(title, company, company_id, status)')
    .eq('applicant_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = (data as unknown as MyApplicationRow[]) ?? []

  // Живые имя/лого компании (denormalized vacancies.company устаревает после
  // переименования; лого там вообще нет) — батч-запрос по company_id.
  const companyIds = [
    ...new Set(rows.map((r) => r.vacancies?.company_id).filter((x): x is string => !!x)),
  ]
  const companyById = new Map<string, { name?: string; logo?: string }>()
  if (companyIds.length) {
    const { data: comps } = await supabase
      .from('companies')
      .select('id, name, logo_url, avatar_url')
      .in('id', companyIds)
    for (const c of (comps ?? []) as {
      id: string
      name: string | null
      logo_url: string | null
      avatar_url: string | null
    }[]) {
      companyById.set(c.id, {
        name: c.name?.trim() || undefined,
        logo: c.logo_url ?? c.avatar_url ?? undefined,
      })
    }
  }

  return rows.map((row) => {
    // Закрыто: вакансию удалили (embed null) ИЛИ у неё статус 'closed'.
    const closed = row.vacancies === null || row.vacancies.status === 'closed'
    const status: MyApplication['status'] = closed
      ? 'closed'
      : row.status === 'rejected'
        ? 'rejected'
        : 'sent'
    const live = row.vacancies?.company_id ? companyById.get(row.vacancies.company_id) : undefined
    const company = live?.name || row.vacancies?.company || 'Компания'
    return {
      id: row.id,
      vacancyId: row.vacancy_id,
      vacancyTitle: row.vacancies?.title || 'Вакансия',
      company,
      companyInitials: initials(company),
      companyLogo: live?.logo,
      status,
      appliedAt: new Date(row.created_at).getTime(),
    }
  })
}

/** id вакансий, на которые текущий пользователь уже откликнулся. */
export async function fetchMyAppliedIds(): Promise<string[]> {
  const { data: sess } = await supabase.auth.getSession()
  const uid = sess.session?.user?.id
  if (!uid) return []
  const { data, error } = await supabase
    .from('vacancy_applications')
    .select('vacancy_id')
    .eq('applicant_id', uid)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => r.vacancy_id as string)
}
