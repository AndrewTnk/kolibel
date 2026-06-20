import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import type { RootState } from '../../../app/store/store'
import { networkActions } from './networkSlice'
import type { Company, NetworkPerson } from './types'

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

function initials(name: string): string {
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

/** Роль-тег для блока «эксперты»: HR / Founder / Lead (по названию должности). */
function roleTag(jobTitle: string): string | undefined {
  const t = jobTitle.toLowerCase()
  if (/hr|recruit|talent|people/.test(t)) return 'HR'
  if (/founder|co-?founder|ceo|cto|coo/.test(t)) return 'Founder'
  if (/lead|head|principal|staff/.test(t)) return 'Lead'
  return undefined
}

/** Тёплые пастельные пары для баннеров/лого — детерминированно по id. */
const BG_PALETTE: [string, string][] = [
  ['#fdece2', '#f3b89e'],
  ['#fef3ec', '#fad0b0'],
  ['#fff5ef', '#fbe3d6'],
  ['#fbe3d6', '#f3b89e'],
]
function bgFor(id: string): [string, string] {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return BG_PALETTE[Math.abs(h) % BG_PALETTE.length]
}

type JobStatus = { company?: string; companyLogo?: string } | null

type ProfileRow = {
  id: string
  full_name: string | null
  job_title: string | null
  location: string | null
  avatar_url: string | null
  banner_url: string | null
  account_type: 'user' | 'company' | null
  job_status: JobStatus
  skills: string[] | null
  about: string | null
}

function rowToPerson(row: ProfileRow): NetworkPerson {
  const name = row.full_name?.trim() || 'Пользователь'
  const js = row.job_status ?? null
  return {
    id: row.id,
    fullName: name,
    jobTitle: row.job_title?.trim() || '',
    company: js?.company || undefined,
    companyLogo: js?.companyLogo || undefined,
    location: row.location?.trim() || '',
    avatarInitials: initials(name),
    avatar: row.avatar_url ?? undefined,
    banner: row.banner_url ?? undefined,
    isOnline: false,
    tag: roleTag(row.job_title ?? ''),
    skills: row.skills ?? undefined,
    about: row.about?.trim() || undefined,
    bg: bgFor(row.id),
  }
}

type CompanyRow = {
  id: string
  name: string | null
  industry: string | null
  about: string | null
  location: string | null
  country: string | null
  size: string | null
  logo_url: string | null
  banner_url: string | null
}

function rowToCompanyCard(row: CompanyRow, openVacancies = 0): Company {
  const name = row.name?.trim() || 'Компания'
  return {
    id: row.id,
    name,
    field: row.industry?.trim() || '',
    logoInitial: name.charAt(0).toUpperCase() || 'K',
    logo: row.logo_url ?? undefined,
    banner: row.banner_url ?? undefined,
    about: row.about?.trim() || '',
    location: row.location?.trim() || '',
    country: row.country?.trim() || undefined,
    size: row.size?.trim() || undefined,
    openVacancies,
    bg: bgFor(row.id),
  }
}

const PERSON_COLS =
  'id, full_name, job_title, location, avatar_url, banner_url, account_type, job_status, skills, about'
const COMPANY_COLS = 'id, name, industry, about, location, country, size, logo_url, banner_url'

type VacancyStats = { total: number; recent: number }

/** Активные вакансии у компаний: всего + сколько появилось за последнюю неделю. */
async function vacancyCounts(companyIds: string[]): Promise<Record<string, VacancyStats>> {
  if (!companyIds.length) return {}
  const counts: Record<string, VacancyStats> = {}
  // Пробуем с created_at (для бейджа «+N новых»); если колонки нет — без неё.
  let rows: { company_id: string | null; created_at?: string | null }[]
  const withDate = await supabase
    .from('vacancies')
    .select('company_id, created_at')
    .in('company_id', companyIds)
  if (withDate.error) {
    const plain = await supabase.from('vacancies').select('company_id').in('company_id', companyIds)
    if (plain.error) throw new Error(plain.error.message)
    rows = (plain.data ?? []) as { company_id: string | null }[]
  } else {
    rows = (withDate.data ?? []) as { company_id: string | null; created_at: string | null }[]
  }
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  for (const r of rows) {
    if (!r.company_id) continue
    const s = (counts[r.company_id] ??= { total: 0, recent: 0 })
    s.total += 1
    if (r.created_at && new Date(r.created_at).getTime() >= weekAgo) s.recent += 1
  }
  return counts
}

/**
 * Сколько людей из моей сети (на кого я подписан) связаны с каждым из targetIds —
 * т.е. подписаны на target. Для людей это «N общих связей», для компаний — «из твоей сети».
 */
async function mutualCounts(
  myFollowing: string[],
  targetIds: string[],
): Promise<Record<string, number>> {
  if (!myFollowing.length || !targetIds.length) return {}
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, followee_id')
    .in('follower_id', myFollowing)
    .in('followee_id', targetIds)
  if (error) throw new Error(error.message)
  const counts: Record<string, number> = {}
  for (const r of (data ?? []) as { follower_id: string; followee_id: string }[]) {
    counts[r.followee_id] = (counts[r.followee_id] ?? 0) + 1
  }
  return counts
}

/** Всего подписчиков у каждого targetId (сигнал популярности для рекомендаций). */
async function followerCounts(targetIds: string[]): Promise<Record<string, number>> {
  if (!targetIds.length) return {}
  const { data, error } = await supabase
    .from('follows')
    .select('followee_id')
    .in('followee_id', targetIds)
  if (error) throw new Error(error.message)
  const counts: Record<string, number> = {}
  for (const r of (data ?? []) as { followee_id: string }[]) {
    counts[r.followee_id] = (counts[r.followee_id] ?? 0) + 1
  }
  return counts
}

export type NetworkPayload = {
  recommendedPeople: NetworkPerson[]
  recommendedCompanies: Company[]
  followingPeople: NetworkPerson[]
  followingCompanies: Company[]
  followers: NetworkPerson[]
  followingIds: string[]
}

/** Загрузка раздела «Сеть»: рекомендации, мои подписки/подписчики. */
export const loadNetwork = createAsyncThunk<NetworkPayload, void>('network/load', async () => {
  const me = await currentUserId()
  const empty: NetworkPayload = {
    recommendedPeople: [],
    recommendedCompanies: [],
    followingPeople: [],
    followingCompanies: [],
    followers: [],
    followingIds: [],
  }
  if (!me) return empty

  // 1) Рекомендованные люди — другие пользователи
  const recRes = await supabase
    .from('profiles')
    .select(PERSON_COLS)
    .eq('account_type', 'user')
    .neq('id', me)
    .limit(60)
  if (recRes.error) throw new Error(recRes.error.message)
  const recommendedPeople = (recRes.data as ProfileRow[]).map(rowToPerson)

  // 1b) Рекомендованные компании — другие компании
  const recCompRes = await supabase
    .from('companies')
    .select(COMPANY_COLS)
    .neq('id', me)
    .limit(40)
  if (recCompRes.error) throw new Error(recCompRes.error.message)
  const recCompanyRows = recCompRes.data as CompanyRow[]

  // 2) Мои подписки (followee), с профилем того, на кого подписан
  const folRes = await supabase
    .from('follows')
    .select(`followee_id, p:profiles!follows_followee_id_fkey(${PERSON_COLS})`)
    .eq('follower_id', me)
  if (folRes.error) throw new Error(folRes.error.message)
  const followingRows = (folRes.data ?? []) as unknown as { followee_id: string; p: ProfileRow }[]
  const followingIds = followingRows.map((r) => r.followee_id)
  const followingPeople = followingRows
    .filter((r) => r.p && r.p.account_type !== 'company')
    .map((r) => rowToPerson(r.p))
  const companyFolloweeIds = followingRows
    .filter((r) => r.p && r.p.account_type === 'company')
    .map((r) => r.followee_id)

  // подтягиваем данные компаний-подписок
  let followingCompanyRows: CompanyRow[] = []
  if (companyFolloweeIds.length) {
    const compRes = await supabase
      .from('companies')
      .select(COMPANY_COLS)
      .in('id', companyFolloweeIds)
    if (compRes.error) throw new Error(compRes.error.message)
    followingCompanyRows = compRes.data as CompanyRow[]
  }

  // 3) Мои подписчики (follower)
  const fwRes = await supabase
    .from('follows')
    .select(`follower_id, p:profiles!follows_follower_id_fkey(${PERSON_COLS})`)
    .eq('followee_id', me)
  if (fwRes.error) throw new Error(fwRes.error.message)
  const followerRows = ((fwRes.data ?? []) as unknown as { p: ProfileRow }[]).filter((r) => r.p)
  const followers = followerRows.map((r) => rowToPerson(r.p))
  // Подписчики-компании: имя/лого живут в `companies`, а не `profiles.full_name`
  // (он у компаний пуст → показывалось «Пользователь»). Дотягиваем.
  const followerCompanyIds = followerRows
    .filter((r) => r.p.account_type === 'company')
    .map((r) => r.p.id)
  if (followerCompanyIds.length) {
    const { data: compData } = await supabase
      .from('companies')
      .select('id, name, logo_url, avatar_url')
      .in('id', followerCompanyIds)
    const byId = new Map(
      ((compData ?? []) as { id: string; name: string | null; logo_url: string | null; avatar_url: string | null }[]).map(
        (c) => [c.id, c],
      ),
    )
    for (const f of followers) {
      const c = byId.get(f.id)
      if (!c) continue
      f.isCompany = true
      const name = c.name?.trim()
      if (name) {
        f.fullName = name
        f.avatarInitials = initials(name)
      }
      const ava = c.logo_url?.trim() || c.avatar_url?.trim()
      if (ava) f.avatar = ava
    }
  }

  // Счётчики активных вакансий для всех показываемых компаний
  const allCompanyIds = [
    ...new Set([...recCompanyRows.map((r) => r.id), ...followingCompanyRows.map((r) => r.id)]),
  ]

  // Общие связи с рекомендациями + популярность (всего подписчиков).
  // Причина/скоринг рекомендаций считаются на фронте (lib/recommend.ts) — здесь
  // только сырые сигналы (mutual / followerCount), чтобы их можно было взвешивать.
  const recPeopleIds = recommendedPeople.map((p) => p.id)
  const recCompIds = recCompanyRows.map((r) => r.id)
  const [counts, peopleMutual, companyMutual, peopleFollowers, companyFollowers] = await Promise.all([
    vacancyCounts(allCompanyIds),
    mutualCounts(followingIds, recPeopleIds),
    mutualCounts(followingIds, recCompIds),
    followerCounts(recPeopleIds),
    followerCounts(recCompIds),
  ])

  const enrichedPeople = recommendedPeople.map((p) => ({
    ...p,
    mutual: peopleMutual[p.id] ?? 0,
    followerCount: peopleFollowers[p.id] ?? 0,
  }))

  function enrichCompany(c: Company): Company {
    const stat = counts[c.id]
    return {
      ...c,
      openVacancies: stat?.total ?? c.openVacancies,
      newVacancies: stat?.recent ?? 0,
      fromNetwork: companyMutual[c.id] ?? 0,
      followerCount: companyFollowers[c.id] ?? 0,
    }
  }
  const recommendedCompanies = recCompanyRows
    .map((r) => rowToCompanyCard(r, counts[r.id]?.total ?? 0))
    .map(enrichCompany)
  const followingCompanies = followingCompanyRows.map((r) =>
    rowToCompanyCard(r, counts[r.id]?.total ?? 0),
  )

  return {
    recommendedPeople: enrichedPeople,
    recommendedCompanies,
    followingPeople,
    followingCompanies,
    followers,
    followingIds,
  }
})

/** Подписаться / отписаться (оптимистично, с откатом при ошибке). */
export const toggleFollow = createAsyncThunk<void, string>(
  'network/toggleFollow',
  async (targetId, { getState, dispatch }) => {
    const me = await currentUserId()
    if (!me) throw new Error('Нет активной сессии')
    if (targetId === me) return
    const state = getState() as RootState
    const isFollowing = state.network.followingIds.includes(targetId)

    dispatch(networkActions.applyFollow({ targetId, following: !isFollowing }))
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', me)
          .eq('followee_id', targetId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: me, followee_id: targetId })
        if (error) throw error
      }
    } catch (e) {
      dispatch(networkActions.applyFollow({ targetId, following: isFollowing })) // откат
      throw e
    }
  },
)
