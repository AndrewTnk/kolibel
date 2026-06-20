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

/**
 * Поиск людей и компаний по имени/названию. Пустой запрос → подсказки (первые N).
 * Текущий пользователь исключается из выдачи.
 */
export async function searchEntities(query: string): Promise<SearchResults> {
  const { data: sess } = await supabase.auth.getSession()
  const me = sess.session?.user?.id ?? '00000000-0000-0000-0000-000000000000'
  const q = query.trim()
  const pattern = `%${escapeLike(q)}%`

  // Люди
  let peopleQ = supabase
    .from('profiles')
    .select('id, full_name, job_title, avatar_url, job_status')
    .eq('account_type', 'user')
    .neq('id', me)
    .order('full_name', { ascending: true })
    .limit(LIMIT)
  if (q) peopleQ = peopleQ.ilike('full_name', pattern)

  // Компании
  let compQ = supabase
    .from('companies')
    .select('id, name, industry, location, logo_url')
    .neq('id', me)
    .order('name', { ascending: true })
    .limit(LIMIT)
  if (q) compQ = compQ.ilike('name', pattern)

  const [peopleRes, compRes] = await Promise.all([peopleQ, compQ])
  if (peopleRes.error) throw new Error(peopleRes.error.message)
  if (compRes.error) throw new Error(compRes.error.message)

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
  ).map((r) => {
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
