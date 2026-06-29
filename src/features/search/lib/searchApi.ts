import { supabase } from '../../../shared/lib/supabase'

export type SearchPerson = {
  id: string
  name: string
  subtitle: string
  avatar?: string
  initials: string
  /** Текущая компания и её лого (бейдж рядом с именем). */
  company?: string
  companyLogo?: string
}

export type SearchCompany = {
  id: string
  name: string
  subtitle: string
  logo?: string
  initial: string
}

export type SearchResults = {
  people: SearchPerson[]
  companies: SearchCompany[]
}

function initials(name: string): string {
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

/** Экранируем спецсимволы LIKE (%, _) в пользовательском вводе. */
function escapeLike(q: string): string {
  return q.replace(/[%_\\]/g, (m) => `\\${m}`)
}

const LIMIT = 6
const SUGGEST_LIMIT = 3 // пустой запрос (подсказки при фокусе) — по 3 человека и компании

/**
 * Поиск людей и компаний по имени/названию. Пустой запрос → подсказки (по 3).
 * Текущий пользователь исключается из выдачи.
 */
export async function searchEntities(query: string): Promise<SearchResults> {
  const { data: sess } = await supabase.auth.getSession()
  const me = sess.session?.user?.id ?? '00000000-0000-0000-0000-000000000000'
  const q = query.trim()
  const pattern = `%${escapeLike(q)}%`
  const lim = q ? LIMIT : SUGGEST_LIMIT

  // Люди (только публичные и не заблокированные модерацией профили)
  let peopleQ = supabase
    .from('profiles')
    .select('id, full_name, job_title, avatar_url, job_status')
    .eq('account_type', 'user')
    .eq('is_public', true)
    .neq('status', 'blocked')
    .neq('id', me)
    .order('full_name', { ascending: true })
    .limit(lim)
  if (q) peopleQ = peopleQ.ilike('full_name', pattern)

  // Компании (берём с запасом — приватные отфильтруем по profiles.is_public)
  let compQ = supabase
    .from('companies')
    .select('id, name, industry, location, logo_url')
    .neq('id', me)
    .order('name', { ascending: true })
    .limit(lim * 3)
  if (q) compQ = compQ.ilike('name', pattern)

  const [peopleRes, compRes] = await Promise.all([peopleQ, compQ])
  if (peopleRes.error) throw new Error(peopleRes.error.message)
  if (compRes.error) throw new Error(compRes.error.message)

  // Скрываем компании с непубличным профилем-аккаунтом.
  const compRows = (compRes.data ?? []) as { id: string }[]
  const publicCompanyIds = await filterPublicIds(compRows.map((r) => r.id))

  const people: SearchPerson[] = (
    peopleRes.data as {
      id: string
      full_name: string | null
      job_title: string | null
      avatar_url: string | null
      job_status: { company?: string; companyLogo?: string } | null
    }[]
  ).map((r) => {
    const name = r.full_name?.trim() || 'Пользователь'
    const company = r.job_status?.company || undefined
    return {
      id: r.id,
      name,
      subtitle: [r.job_title?.trim(), company].filter(Boolean).join(' · ') || 'Пользователь',
      avatar: r.avatar_url ?? undefined,
      initials: initials(name),
      company,
      companyLogo: r.job_status?.companyLogo || undefined,
    }
  })

  const companies: SearchCompany[] = (
    compRes.data as { id: string; name: string | null; industry: string | null; location: string | null; logo_url: string | null }[]
  )
    .filter((r) => publicCompanyIds.has(r.id))
    .slice(0, lim)
    .map((r) => {
      const name = r.name?.trim() || 'Компания'
      const sub = [r.industry?.trim(), r.location?.trim()].filter(Boolean).join(' · ')
      return {
        id: r.id,
        name,
        subtitle: sub || 'Компания',
        logo: r.logo_url ?? undefined,
        initial: name.charAt(0).toUpperCase() || 'K',
      }
    })

  return { people, companies }
}

/**
 * Из набора id профилей возвращает множество тех, у кого профиль публичный
 * (is_public = true). Используется для скрытия приватных компаний из выдачи,
 * т.к. таблица companies не хранит флаг — он живёт в profiles того же аккаунта.
 */
async function filterPublicIds(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set()
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .in('id', ids)
    .eq('is_public', true)
    .neq('status', 'blocked')
  if (error) return new Set(ids) // мягкая деградация: не прячем, если запрос упал
  return new Set((data ?? []).map((r) => (r as { id: string }).id))
}
