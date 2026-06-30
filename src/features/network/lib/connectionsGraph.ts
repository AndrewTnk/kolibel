import { supabase } from '../../../shared/lib/supabase'

/** Тип прямой связи: подписка (я подписан) или подписчик (подписан на меня). */
export type Relation = 'following' | 'follower'

/** Узел графа связей. degree: 0 — это вы, 1 — прямая связь, 2 — связь второго уровня (серая). */
export type GraphNodeData = {
  id: string
  kind: 'me' | 'person' | 'company'
  name: string
  sub: string
  avatar?: string
  initial: string
  degree: 0 | 1 | 2
  /** Для прямых связей (degree 1): подписка или подписчик. */
  relation?: Relation
}

export type GraphEdgeData = { source: string; target: string; degree: 1 | 2 }

export type ConnectionsGraph = { nodes: GraphNodeData[]; edges: GraphEdgeData[] }

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

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

type ProfileRow = {
  id: string
  full_name: string | null
  job_title: string | null
  avatar_url: string | null
  account_type: 'user' | 'company' | null
}
type CompanyRow = { id: string; name: string | null; industry: string | null; logo_url: string | null }

/**
 * Граф карьерных связей вокруг корневого профиля `rootId` (по умолчанию — текущий
 * пользователь). degree 1 — прямые связи корня (подписки/подписчики), degree 2 —
 * связи второго уровня. Все id — из profiles (у компаний — та же строка в companies).
 */
export async function fetchConnectionsGraph(rootId?: string): Promise<ConnectionsGraph> {
  const { data: sess } = await supabase.auth.getSession()
  const viewerId = sess.session?.user?.id
  const root = rootId ?? viewerId
  if (!root) return { nodes: [], edges: [] }

  // 1) Прямые связи корня: исходящие (root → кто-то) и входящие (кто-то → root)
  const [outRes, inRes] = await Promise.all([
    supabase.from('follows').select('followee_id').eq('follower_id', root),
    supabase.from('follows').select('follower_id').eq('followee_id', root),
  ])
  if (outRes.error) throw new Error(outRes.error.message)
  if (inRes.error) throw new Error(inRes.error.message)

  const following = uniq((outRes.data ?? []).map((r) => (r as { followee_id: string }).followee_id))
  const followers = uniq((inRes.data ?? []).map((r) => (r as { follower_id: string }).follower_id))
  const followingSet = new Set(following)
  const directIds = uniq([...following, ...followers]).filter((id) => id !== root)

  // Только прямые связи (1-й круг). Вторичные связи (2-й круг) убраны.

  // 2) Данные профилей/компаний для всех узлов (+ сам корень)
  const allIds = uniq([root, ...directIds])
  const profRes = await supabase
    .from('profiles')
    .select('id, full_name, job_title, avatar_url, account_type')
    .in('id', allIds)
  if (profRes.error) throw new Error(profRes.error.message)
  const profiles = (profRes.data ?? []) as ProfileRow[]

  const companyIds = profiles.filter((p) => p.account_type === 'company').map((p) => p.id)
  let companies: CompanyRow[] = []
  if (companyIds.length) {
    const compRes = await supabase
      .from('companies')
      .select('id, name, industry, logo_url')
      .in('id', companyIds)
    if (compRes.error) throw new Error(compRes.error.message)
    companies = (compRes.data ?? []) as CompanyRow[]
  }
  const compById = new Map(companies.map((c) => [c.id, c]))

  const nodes: GraphNodeData[] = profiles.map((p) => {
    const isCompany = p.account_type === 'company'
    const comp = compById.get(p.id)
    const name = isCompany
      ? comp?.name?.trim() || p.full_name?.trim() || 'Компания'
      : p.full_name?.trim() || 'Пользователь'
    const degree: 0 | 1 | 2 = p.id === root ? 0 : 1
    // «Подписка» — корень подписан на узел; иначе (узел подписан на корень) — «подписчик».
    const relation: Relation | undefined =
      degree === 1 ? (followingSet.has(p.id) ? 'following' : 'follower') : undefined
    // Центр: если корень — текущий пользователь, подписываем «Вы».
    const centerName = p.id === root && root === viewerId ? 'Вы' : name
    return {
      id: p.id,
      kind: isCompany ? 'company' : 'person',
      name: centerName,
      sub: isCompany ? comp?.industry?.trim() || 'Компания' : p.job_title?.trim() || 'Пользователь',
      avatar: isCompany ? comp?.logo_url ?? undefined : p.avatar_url ?? undefined,
      initial: isCompany ? name.charAt(0).toUpperCase() || 'K' : initials(name),
      degree,
      relation,
    }
  })
  const nodeIds = new Set(nodes.map((n) => n.id))

  // 3) Рёбра: только прямые (корень → связь)
  const edgeKey = new Set<string>()
  const edges: GraphEdgeData[] = []
  const addEdge = (source: string, target: string, degree: 1 | 2) => {
    if (source === target) return
    if (!nodeIds.has(source) || !nodeIds.has(target)) return
    const key = [source, target].sort().join('|')
    if (edgeKey.has(key)) return
    edgeKey.add(key)
    edges.push({ source, target, degree })
  }
  for (const id of directIds) addEdge(root, id, 1)

  return { nodes, edges }
}
