import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import type { RootState } from '../../../app/store/store'
import { fetchMyAppliedIds, fetchMyApplicationsDetailed } from '../lib/applicationsApi'
import { rowToVacancy, type VacancyInsert, type VacancyRow } from '../lib/mapVacancy'
import { nameInitials } from '../lib/initials'
import type { EmploymentType, MyApplication, Vacancy, VacancyStatus, WorkFormat } from './types'

/** Поля формы создания/редактирования вакансии. */
export type NewVacancyInput = {
  title: string
  city: string
  workFormats: WorkFormat[]
  employmentTypes: EmploymentType[]
  /** Требуемый опыт в годах (диапазон). */
  experienceFrom?: number
  experienceTo?: number
  salaryFrom?: number
  salaryTo?: number
  skills: string[]
  description: string
  /** Обязанности (по строке) — колонка conditions. */
  responsibilities?: string[]
  /** Требования (по строке) — колонка requirements. */
  requirements?: string[]
  /** Статус публикации: 'active' (опубликовать) или 'draft' (черновик). */
  status?: VacancyStatus
}

async function currentUser() {
  const { data } = await supabase.auth.getSession()
  return { id: data.session?.user?.id ?? null, email: data.session?.user?.email ?? '' }
}

/** Загрузка всех вакансий. */
export const loadVacancies = createAsyncThunk<Vacancy[], void>('vacancies/load', async () => {
  const { data, error } = await supabase
    .from('vacancies')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const vacancies = (data as VacancyRow[]).map(rowToVacancy)

  // Освежаем денормализованные название/описание компании из таблицы companies —
  // в строке вакансии они снимок на момент создания и устаревают после редактирования
  // профиля компании (название/описание на карточках и в peek-модалке были старыми).
  const ids = [...new Set(vacancies.map((v) => v.companyId).filter(Boolean))] as string[]
  if (ids.length) {
    const { data: comps } = await supabase
      .from('companies')
      .select('id, name, about, logo_url, avatar_url')
      .in('id', ids)
    if (comps) {
      const byId = new Map(
        (
          comps as {
            id: string
            name: string | null
            about: string | null
            logo_url: string | null
            avatar_url: string | null
          }[]
        ).map((c) => [c.id, c]),
      )
      for (const v of vacancies) {
        const c = v.companyId ? byId.get(v.companyId) : undefined
        if (!c) continue
        if (c.name) v.company = c.name
        if (c.about != null) v.companyAbout = c.about
        const logo = c.logo_url || c.avatar_url
        if (logo) v.companyLogo = logo
      }
    }
  }
  return vacancies
})

/** Создание вакансии текущей компанией. */
export const createVacancy = createAsyncThunk<Vacancy, NewVacancyInput>(
  'vacancies/create',
  async (input, { getState }) => {
    const { id: uid, email } = await currentUser()
    if (!uid) throw new Error('Нет активной сессии')
    const company = (getState() as RootState).company.profile

    const insert: VacancyInsert = {
      company_id: uid,
      status: input.status ?? 'active',
      company: company.name || 'Компания',
      company_about: company.about || '',
      title: input.title.trim(),
      city: input.city.trim() || 'Удалённо',
      work_format: input.workFormats.join(',') || 'office',
      employment_type: input.employmentTypes.join(',') || 'full',
      experience_from: input.experienceFrom ?? null,
      experience_to: input.experienceTo ?? null,
      salary_from: input.salaryFrom ?? null,
      salary_to: input.salaryTo ?? null,
      currency: '₽',
      skills: input.skills,
      description: input.description.trim() || 'Описание появится позже.',
      requirements: input.requirements ?? [],
      conditions: input.responsibilities ?? [],
      contact_email: email,
      contact_telegram: null,
    }

    // Повторяем insert, отбрасывая поля непримененных миграций (0017 — опыт в годах, 0020 — статус).
    let payload: Record<string, unknown> = { ...insert }
    let data: unknown = null
    let error: { message: string } | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      ;({ data, error } = await supabase.from('vacancies').insert(payload).select('*').single())
      if (!error) break
      if (/experience_(from|to)/.test(error.message)) {
        const { experience_from, experience_to, ...rest } = payload
        void experience_from
        void experience_to
        payload = rest
      } else if (/status/.test(error.message)) {
        const { status, ...rest } = payload
        void status
        payload = rest
      } else break
    }
    if (error) throw new Error(error.message)
    return rowToVacancy(data as VacancyRow)
  },
)

/** Редактирование существующей вакансии (RLS — только свою). */
export const updateVacancy = createAsyncThunk<Vacancy, { id: string; input: NewVacancyInput }>(
  'vacancies/update',
  async ({ id, input }) => {
    const patch: Record<string, unknown> = {
      title: input.title.trim(),
      city: input.city.trim() || 'Удалённо',
      work_format: input.workFormats.join(',') || 'office',
      employment_type: input.employmentTypes.join(',') || 'full',
      experience_from: input.experienceFrom ?? null,
      experience_to: input.experienceTo ?? null,
      salary_from: input.salaryFrom ?? null,
      salary_to: input.salaryTo ?? null,
      skills: input.skills,
      description: input.description.trim() || 'Описание появится позже.',
      requirements: input.requirements ?? [],
      conditions: input.responsibilities ?? [],
    }
    if (input.status) patch.status = input.status

    let payload: Record<string, unknown> = { ...patch }
    let data: unknown = null
    let error: { message: string } | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      ;({ data, error } = await supabase.from('vacancies').update(payload).eq('id', id).select('*').single())
      if (!error) break
      if (/experience_(from|to)/.test(error.message)) {
        const { experience_from, experience_to, ...rest } = payload
        void experience_from
        void experience_to
        payload = rest
      } else if (/status/.test(error.message)) {
        const { status, ...rest } = payload
        void status
        payload = rest
      } else break
    }
    if (error) throw new Error(error.message)
    return rowToVacancy(data as VacancyRow)
  },
)

/** Смена статуса вакансии (пауза / возобновить / закрыть). RLS — только свою. */
export const updateVacancyStatus = createAsyncThunk<
  { id: string; status: VacancyStatus },
  { id: string; status: VacancyStatus }
>('vacancies/updateStatus', async ({ id, status }) => {
  const { error } = await supabase.from('vacancies').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
  return { id, status }
})

/** Удаление вакансии (RLS разрешает только свою). */
export const removeVacancy = createAsyncThunk<string, string>(
  'vacancies/remove',
  async (id) => {
    const { error } = await supabase.from('vacancies').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return id
  },
)

/** Отклик на вакансию (данные кандидата берём из его профиля). */
export const applyToVacancy = createAsyncThunk<
  { vacancyId: string; application: MyApplication | null },
  string
>('vacancies/apply', async (vacancyId, { getState }) => {
  const state = getState() as RootState
  const { id: uid, email } = await currentUser()
  if (!uid) throw new Error('Нет активной сессии')
  const resume = state.profile.resume
  const { data, error } = await supabase
    .from('vacancy_applications')
    .insert({
      vacancy_id: vacancyId,
      applicant_id: uid,
      applicant_name: resume.fullName,
      applicant_title: resume.jobTitle,
      applicant_email: email,
    })
    .select('id')
    .single()
  // 23505 — повторный отклик: считаем уже откликнувшимся, не ошибка
  if (error && error.code !== '23505') throw new Error(error.message)

  // Оптимистичный элемент для «Мои отклики» (новый отклик + вакансия есть в сторе).
  const v = state.vacanciesList.items.find((x) => x.id === vacancyId)
  const application: MyApplication | null =
    data && v
      ? {
          id: (data as { id: string }).id,
          vacancyId,
          vacancyTitle: v.title,
          company: v.company,
          companyInitials: nameInitials(v.company),
          companyLogo: v.companyLogo,
          status: 'sent',
          appliedAt: Date.now(),
        }
      : null
  return { vacancyId, application }
})

/** Отозвать свой отклик на вакансию. */
export const withdrawApplication = createAsyncThunk<string, string>(
  'vacancies/withdraw',
  async (vacancyId) => {
    const { id: uid } = await currentUser()
    if (!uid) throw new Error('Нет активной сессии')
    const { error } = await supabase
      .from('vacancy_applications')
      .delete()
      .eq('vacancy_id', vacancyId)
      .eq('applicant_id', uid)
    if (error) throw new Error(error.message)
    return vacancyId
  },
)

/** id вакансий, на которые текущий пользователь уже откликнулся. */
export const loadMyApplications = createAsyncThunk<string[], void>(
  'vacancies/myApplications',
  async () => fetchMyAppliedIds(),
)

/** Детальный список моих откликов (заголовок вакансии, компания, статус) для «Мои отклики». */
export const loadMyApplicationsDetailed = createAsyncThunk<MyApplication[], void>(
  'vacancies/myApplicationsDetailed',
  async () => fetchMyApplicationsDetailed(),
)

/** Инкремент просмотров вакансии (кроме случая, когда смотрит сам владелец). */
export const incrementVacancyView = createAsyncThunk<string | null, string>(
  'vacancies/view',
  async (id, { getState }) => {
    const state = getState() as RootState
    const myId = state.auth.user?.id
    const v = state.vacanciesList.items.find((x) => x.id === id)
    if (v?.companyId && v.companyId === myId) return null // свою не считаем
    const { error } = await supabase.rpc('increment_vacancy_views', { p_id: id })
    if (error) throw new Error(error.message)
    return id
  },
)
