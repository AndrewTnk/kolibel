import type { FeedPost } from '../model/types'

/**
 * Ранжирование общей ленты единым score — MVP-версия алгоритма а-ля X/Threads
 * на «холодном старте» (без обучения на поведении, см. CONTEXT_HANDOFF).
 *
 * Score складывается из: свежести, бонуса за подписку на автора, «горячести»
 * (вовлечённость с затуханием по времени), соц-доказательства («лайкнули твои
 * подписки»), совпадения по сфере (интерес-затравка) и популярности аккаунта.
 * После сортировки применяется разнообразие — не больше `MAX_PER_AUTHOR` постов
 * одного автора в начале ленты и интервал `MIN_GAP` между ними.
 */

export type RankContext = {
  myId?: string
  /** На кого я подписан (id людей и компаний). */
  followingIds: Set<string>
  /** Мои интересы (навыки/индустрия/должность), в нижнем регистре. */
  myInterests: Set<string>
}

/** Веса вкладов — здесь удобно «крутить» поведение ленты. */
export const WEIGHTS = {
  recency: 1.0, // свежесть
  followed: 6.0, // автор в подписках
  hot: 2.2, // «горячесть» (вовлечённость с затуханием)
  social: 3.0, // лайкнули мои подписки (соц-доказательство)
  interest: 2.5, // совпадение по сфере
  popular: 1.2, // популярный аккаунт (много подписчиков)
}

/** Разнообразие: лимит постов одного автора в «голове» ленты + минимальный интервал. */
const MAX_PER_AUTHOR = 2
const MIN_GAP = 3

const HOUR = 3_600_000

const norm = (s: string) => s.trim().toLowerCase()

/** Сколько интересов автора совпадает с моими. */
function interestOverlap(authorInterests: string[] | undefined, mine: Set<string>): number {
  if (!authorInterests?.length || !mine.size) return 0
  let n = 0
  const seen = new Set<string>()
  for (const t of authorInterests) {
    const k = norm(t)
    if (!k || seen.has(k)) continue
    seen.add(k)
    if (mine.has(k)) n++
  }
  return n
}

/** Score одного поста (больше — выше в ленте). */
export function scorePost(p: FeedPost, ctx: RankContext, now: number): number {
  const ageH = Math.max(0, (now - p.createdAt) / HOUR)

  // Свежесть: ~1.0 для свежего, плавно падает (примерно половина за сутки).
  const recency = 1 / (1 + ageH / 24)

  // Горячесть: вовлечённость с «гравитацией» (как у HN/Reddit) — учитывает скорость.
  const engagement = p.likesCount + 2 * p.comments.length
  const hot = engagement / Math.pow(ageH + 2, 1.2)

  // Соц-доказательство: сколько моих подписок лайкнули этот пост.
  let social = 0
  if (ctx.followingIds.size && p.likerIds?.length) {
    for (const id of p.likerIds) if (ctx.followingIds.has(id)) social++
  }

  const followed = ctx.followingIds.has(p.authorId) ? 1 : 0
  const interest = interestOverlap(p.authorInterests, ctx.myInterests)
  const popular = Math.log1p(p.authorFollowers ?? 0)

  return (
    WEIGHTS.recency * recency +
    WEIGHTS.followed * followed +
    WEIGHTS.hot * hot +
    WEIGHTS.social * social +
    WEIGHTS.interest * interest +
    WEIGHTS.popular * popular
  )
}

/** Ранжирует и диверсифицирует ленту. Ничего не теряет: хвост — остаток по score. */
export function rankFeed(posts: FeedPost[], ctx: RankContext): FeedPost[] {
  if (posts.length < 3) return posts
  const now = Date.now()
  const scored = posts
    .map((p) => ({ p, s: scorePost(p, ctx, now) }))
    .sort((a, b) => b.s - a.s)

  const out: FeedPost[] = []
  const used = new Map<string, number>()
  const included = new Set<string>()
  const deferred: typeof scored = []

  const gapOk = (authorId: string) => {
    const from = Math.max(0, out.length - MIN_GAP)
    for (let i = from; i < out.length; i++) if (out[i].authorId === authorId) return false
    return true
  }
  const take = (p: FeedPost) => {
    out.push(p)
    used.set(p.authorId, (used.get(p.authorId) ?? 0) + 1)
    included.add(p.id)
  }

  // Основной проход: соблюдаем лимит автора и интервал.
  for (const item of scored) {
    if ((used.get(item.p.authorId) ?? 0) >= MAX_PER_AUTHOR) continue
    if (!gapOk(item.p.authorId)) {
      deferred.push(item)
      continue
    }
    take(item.p)
  }
  // Отложенные (интервал не прошёл) — досыпаем, соблюдая лимит автора.
  for (const item of deferred) {
    if (included.has(item.p.id)) continue
    if ((used.get(item.p.authorId) ?? 0) >= MAX_PER_AUTHOR) continue
    take(item.p)
  }
  // Остаток (посты сверх лимита автора) — в хвост по score, чтобы ничего не терять.
  for (const item of scored) if (!included.has(item.p.id)) out.push(item.p)

  return out
}
