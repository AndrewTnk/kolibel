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
  const name = row.applicant_name || p?.full_name || 'Без имени'
  return {
    id: row.id,
    userId: row.applicant_id,
    status: row.status ?? 'new',
    name,
    jobTitle: row.applicant_title || p?.job_title || '',
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
  vacancies: { title: string | null; company: string | null } | null
}

/** Детальный список моих откликов для виджета/модалки «Мои отклики». */
export async function fetchMyApplicationsDetailed(): Promise<MyApplication[]> {
  const { data: sess } = await supabase.auth.getSession()
  const uid = sess.session?.user?.id
  if (!uid) return []
  const { data, error } = await supabase
    .from('vacancy_applications')
    .select('id, vacancy_id, status, created_at, vacancies(title, company)')
    .eq('applicant_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data as unknown as MyApplicationRow[]) ?? []).map((row) => {
    const closed = row.vacancies === null
    const status: MyApplication['status'] = closed
      ? 'closed'
      : row.status === 'rejected'
        ? 'rejected'
        : 'sent'
    const company = row.vacancies?.company || 'Компания'
    return {
      id: row.id,
      vacancyId: row.vacancy_id,
      vacancyTitle: row.vacancies?.title || 'Вакансия',
      company,
      companyInitials: initials(company),
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
