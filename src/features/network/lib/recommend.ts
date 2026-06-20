import { computeMatch, personToMatchProfile, type MatchProfile } from '../../vacancies/lib/useVacancyMatch'
import type { Vacancy } from '../../vacancies/model/types'
import type { Company, NetworkPerson, RecommendationReason } from '../model/types'

/**
 * Система рекомендаций раздела «Сеть» (заготовка под рост базы пользователей).
 *
 * Идея — единый score на каждого кандидата (как в `feed/lib/rankFeed.ts`),
 * складывающийся из взвешенных сигналов. У каждого кандидата выбирается главная
 * причина рекомендации (сигнал с наибольшим вкладом) — для бейджа на карточке.
 *
 * Различается по аудитории:
 *  - Люди для пользователя: общие навыки, похожая профессия, HR-специалисты,
 *    популярные, общие связи.
 *  - Люди для компании: подходят под вакансии компании, популярные, общие связи.
 *  - Компании для пользователя: вакансии под профессию, общая сфера (IT для
 *    айтишников), популярность, общие связи.
 *  - Компании для компании: общая сфера/направление, популярность, общие связи.
 *
 * ⚙️ Свежесть: на каждую загрузку страницы — новый `seed` (псевдослучайный джиттер
 * перетасовывает близкие по score карточки) + штраф «недавно показанным»
 * (`recentlyShown`, sessionStorage), чтобы при перезагрузке всплывали новые лица.
 * Пока пользователей мало score'ы близки к нулю → порядок фактически случайный
 * (что и нужно); по мере роста базы relevance начнёт доминировать.
 */

export type Audience = 'user' | 'company'

export type RecContext = {
  audience: Audience
  myId?: string
  followingIds: Set<string>
  /** Мои навыки (нормализованные) — для совпадения по навыкам у людей. */
  mySkills: Set<string>
  /** Токены моей профессии / индустрии — для похожей профессии и сферы. */
  myRoleTokens: Set<string>
  /** Профиль для матчинга к вакансиям компаний (аудитория user). */
  myProfile?: MatchProfile
  /** Мои вакансии (аудитория company) — матчим кандидатов под них. */
  myVacancies: Vacancy[]
  /** Все вакансии, сгруппированные по компании (аудитория user) — матчим под профессию. */
  vacanciesByCompany: Map<string, Vacancy[]>
  /** Сид свежести (меняется на каждую загрузку страницы). */
  seed: number
  /** Недавно показанные id (анти-повтор между перезагрузками). */
  recentlyShown: Set<string>
}

/** Веса сигналов для людей. Здесь удобно «крутить» поведение рекомендаций. */
export const PEOPLE_WEIGHTS = {
  skill: 3.0, // общие навыки
  role: 2.5, // похожая профессия
  hr: 1.6, // специалист по найму
  popular: 1.3, // популярный в сети
  mutual: 3.5, // общие связи
  vacancy: 4.0, // подходит под вакансии (аудитория company)
}

/** Веса сигналов для компаний. */
export const COMPANY_WEIGHTS = {
  vacancy: 4.0, // вакансии под профессию (аудитория user)
  industry: 2.6, // общая сфера / направление
  popular: 1.3,
  mutual: 3.5,
}

/** Амплитуда случайного джиттера и штрафа за недавний показ (в единицах score). */
const JITTER = 2.5
const RECENT_PENALTY = 2.2

export const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е')

export function tokenize(s: string): string[] {
  return (norm(s).match(/[a-zа-я0-9+#.]+/gi) ?? []).filter((t) => t.length >= 3)
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

/** Детерминированный псевдослучайный [0..1) от пары (seed, id). */
function rng(seed: number, id: string): number {
  let t = (seed ^ hashStr(id)) >>> 0
  t += 0x6d2b79f5
  let r = Math.imul(t ^ (t >>> 15), 1 | t)
  r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296
}

function mutualWord(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'общая связь'
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'общие связи'
  return 'общих связей'
}

/** «N общих связей» — для бейджа общих связей на карточках людей и компаний. */
export function mutualLabel(n: number): string {
  return `${n} ${mutualWord(n)}`
}

const roleWord: Record<string, string> = { HR: 'HR-специалист', Founder: 'Основатель', Lead: 'Руководитель' }

type Signal = { kind: RecommendationReason['kind']; weight: number; raw: number; text: string }

/** Лучший % совпадения профиля с набором вакансий (0..1), null если не с чем. */
function bestVacancyMatch(profile: MatchProfile, vacancies: Vacancy[]): { ratio: number; title?: string } {
  let best = 0
  let title: string | undefined
  for (const v of vacancies) {
    const m = computeMatch(v, profile)
    if (m.score != null && m.score > best) {
      best = m.score
      title = v.title
    }
  }
  return { ratio: best / 100, title }
}

// ── Скоринг людей ──────────────────────────────────────────────
function peopleSignals(p: NetworkPerson, ctx: RecContext): Signal[] {
  const sig: Signal[] = []

  if (ctx.audience === 'company') {
    // Подходит под вакансии компании.
    const { ratio, title } = bestVacancyMatch(personToMatchProfile(p), ctx.myVacancies)
    if (ratio > 0)
      sig.push({
        kind: 'vacancy',
        weight: PEOPLE_WEIGHTS.vacancy,
        raw: ratio,
        text: title ? `Подходит под «${title}»` : 'Подходит под ваши вакансии',
      })
  } else {
    // Общие навыки.
    const matched = (p.skills ?? []).filter((s) => ctx.mySkills.has(norm(s)))
    if (matched.length)
      sig.push({
        kind: 'skill',
        weight: PEOPLE_WEIGHTS.skill,
        raw: Math.min(1, matched.length / 3),
        text: `Общие навыки: ${matched.slice(0, 2).join(', ')}`,
      })
    // Похожая профессия (пересечение токенов должности).
    const titleToks = tokenize(p.jobTitle)
    const roleOverlap = titleToks.filter((t) => ctx.myRoleTokens.has(t)).length
    if (roleOverlap > 0)
      sig.push({
        kind: 'role',
        weight: PEOPLE_WEIGHTS.role,
        raw: Math.min(1, roleOverlap / 2),
        text: 'Похожая профессия',
      })
    // HR / Founder / Lead — эксперты по найму и лидеры.
    if (p.tag)
      sig.push({
        kind: 'hr',
        weight: PEOPLE_WEIGHTS.hr,
        raw: 1,
        text: roleWord[p.tag] ?? p.tag,
      })
  }

  // Популярность (всего подписчиков) — общий сигнал.
  const fc = p.followerCount ?? 0
  if (fc > 0)
    sig.push({
      kind: 'popular',
      weight: PEOPLE_WEIGHTS.popular,
      raw: Math.min(1, Math.log1p(fc) / Math.log1p(20)),
      text: 'Популярный в сети',
    })

  // Общие связи — общий сигнал.
  const mutual = p.mutual ?? 0
  if (mutual > 0)
    sig.push({
      kind: 'mutual',
      weight: PEOPLE_WEIGHTS.mutual,
      raw: Math.min(1, mutual / 3),
      text: `${mutual} ${mutualWord(mutual)}`,
    })

  return sig
}

// ── Скоринг компаний ───────────────────────────────────────────
function companySignals(c: Company, ctx: RecContext): Signal[] {
  const sig: Signal[] = []

  // Вакансии под профессию (только для пользователя).
  if (ctx.audience === 'user' && ctx.myProfile) {
    const vacs = ctx.vacanciesByCompany.get(c.id) ?? []
    const { ratio } = bestVacancyMatch(ctx.myProfile, vacs)
    if (ratio > 0)
      sig.push({
        kind: 'vacancy',
        weight: COMPANY_WEIGHTS.vacancy,
        raw: ratio,
        text: 'Есть вакансии для вас',
      })
  }

  // Общая сфера / направление (пересечение токенов индустрии).
  const fieldToks = tokenize(c.field)
  const fieldOverlap = fieldToks.filter((t) => ctx.myRoleTokens.has(t)).length
  if (fieldOverlap > 0)
    sig.push({
      kind: 'industry',
      weight: COMPANY_WEIGHTS.industry,
      raw: Math.min(1, fieldOverlap / 2),
      text: c.field ? `Ваша сфера: ${c.field}` : 'Ваша сфера',
    })

  // Популярность.
  const fc = c.followerCount ?? 0
  if (fc > 0)
    sig.push({
      kind: 'popular',
      weight: COMPANY_WEIGHTS.popular,
      raw: Math.min(1, Math.log1p(fc) / Math.log1p(20)),
      text: 'Популярная компания',
    })

  // Общие связи.
  const mutual = c.fromNetwork ?? 0
  if (mutual > 0)
    sig.push({
      kind: 'mutual',
      weight: COMPANY_WEIGHTS.mutual,
      raw: Math.min(1, mutual / 3),
      text: `${mutual} из вашей сети`,
    })

  return sig
}

export type Scored<T> = { item: T; score: number }
export type ScoredPerson = Scored<NetworkPerson> & { kind: 'person' }
export type ScoredCompany = Scored<Company> & { kind: 'company' }
export type ScoredAny = ScoredPerson | ScoredCompany

/** Свод сигналов в score + выбор главной причины. */
function combine(signals: Signal[], id: string, ctx: RecContext): { score: number; reason?: RecommendationReason } {
  let score = 0
  let top: Signal | null = null
  for (const s of signals) {
    const contrib = s.weight * s.raw
    score += contrib
    if (!top || contrib > top.weight * top.raw) top = s
  }
  // Свежесть: случайный джиттер (новый порядок на каждую загрузку) + анти-повтор.
  score += JITTER * rng(ctx.seed, id)
  if (ctx.recentlyShown.has(id)) score -= RECENT_PENALTY

  const reason = top ? { kind: top.kind, text: top.text } : undefined
  return { score, reason }
}

/** Скоринг людей: возвращает отсортированный по убыванию список с проставленной причиной. */
export function scorePeople(people: NetworkPerson[], ctx: RecContext): ScoredPerson[] {
  return people
    .filter((p) => p.id !== ctx.myId)
    .map((p) => {
      const { score, reason } = combine(peopleSignals(p, ctx), p.id, ctx)
      return { item: { ...p, reason }, score, kind: 'person' as const }
    })
    .sort((a, b) => b.score - a.score)
}

/** Скоринг компаний: возвращает отсортированный по убыванию список с причиной. */
export function scoreCompanies(companies: Company[], ctx: RecContext): ScoredCompany[] {
  return companies
    .filter((c) => c.id !== ctx.myId)
    .map((c) => {
      const { score, reason } = combine(companySignals(c, ctx), c.id, ctx)
      return { item: { ...c, reason }, score, kind: 'company' as const }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Разнообразие: не больше одной причины подряд (всё «вразброс»), сохраняя
 * порядок по score. Жадно берём следующий по score элемент, чья причина
 * отличается от предыдущего; если таких нет — берём лучший оставшийся.
 */
export function spread<S extends { item: { reason?: RecommendationReason } }>(scored: S[]): S[] {
  const pool = [...scored]
  const out: S[] = []
  let prev: string | undefined
  while (pool.length) {
    let idx = pool.findIndex((s) => s.item.reason?.kind !== prev)
    if (idx === -1) idx = 0
    const [picked] = pool.splice(idx, 1)
    out.push(picked)
    prev = picked.item.reason?.kind
  }
  return out
}

// ── Свежесть между перезагрузками (sessionStorage) ─────────────
const SEEN_KEY = 'kolibel:recSeen'
const SEEN_MAX = 24

export function loadRecentlyShown(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/** Запомнить только что показанные id (кольцевой буфер) — чтобы в следующий раз всплыли другие. */
export function pushRecentlyShown(ids: string[]) {
  const prev = [...loadRecentlyShown()]
  const next = [...ids, ...prev].filter((v, i, a) => a.indexOf(v) === i).slice(0, SEEN_MAX)
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}
