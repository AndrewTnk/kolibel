import type { Vacancy } from '../../model/types'
import { ROLES, ROLE_CLUSTER, SKILL_ALIASES, STOPWORDS } from './dictionary'

/** Профиль кандидата для матчинга (любая сторона: соискатель/отклик/sourcing). */
export type MatchProfile = {
  skills: string[]
  jobTitle?: string
  about?: string
  /** Склеенный текст опыта работы (роли/достижения/стек). */
  experienceText?: string
  /** Оценка стажа в годах (если можем посчитать). */
  years?: number
}

export type FacetScore = { pct: number; label: string }

/** Разбивка совпадения по фасетам (для вкладки «Почему подходит»). */
export type MatchBreakdown = {
  role: FacetScore
  skills: FacetScore
  keywords: FacetScore
  exp: FacetScore
}

export type VacancyMatch = {
  /** Процент совпадения. null — нечего сравнивать (пустая вакансия или пустой профиль). */
  score: number | null
  /** Навыки вакансии, реально совпавшие с навыками профиля (с учётом синонимов). */
  matchedSkills: string[]
  /** Короткое объяснение «почему подходит». */
  why: string
  breakdown: MatchBreakdown
}

const NULL_FACET: FacetScore = { pct: 0, label: '—' }
const NULL_MATCH: VacancyMatch = {
  score: null,
  matchedSkills: [],
  why: '',
  breakdown: { role: NULL_FACET, skills: NULL_FACET, keywords: NULL_FACET, exp: NULL_FACET },
}

// ── Нормализация ───────────────────────────────────────────────
function normText(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е')
}

/** Канонизирует навык: lowercase, ё→е, схлопывание пробелов, алиас. */
function canonSkill(s: string): string {
  const n = normText(s).replace(/\s+/g, ' ').trim()
  return SKILL_ALIASES[n] ?? n
}

/** Токенизация свободного текста: слова ≥3 символов без стоп-слов. */
function tokenize(text: string): string[] {
  const matched = normText(text).match(/[a-zа-я0-9+#.]+/gi) ?? []
  return matched.filter((t) => t.length >= 3 && !STOPWORDS.has(t))
}

/** Грубый «стем» для русской морфологии: первые 5 символов у длинных слов. */
function stem(t: string): string {
  return t.length > 5 ? t.slice(0, 5) : t
}

function stemSet(tokens: string[]): Set<string> {
  return new Set(tokens.map(stem))
}

// ── Роль / специальность ───────────────────────────────────────
function classifyRole(text: string): string | null {
  const toks = stemSet(tokenize(text))
  let best: string | null = null
  let bestN = 0
  for (const role in ROLES) {
    let n = 0
    for (const kw of ROLES[role]) if (toks.has(stem(normText(kw)))) n++
    if (n > bestN) {
      bestN = n
      best = role
    }
  }
  return bestN > 0 ? best : null
}

/** Множитель-гейт по специальности: совпала роль → 1, смежная → 0.6, другая → 0.25. */
function specialtyGate(vRole: string | null, pRole: string | null): number {
  if (!vRole || !pRole) return 0.65 // одну из ролей не распознали — нейтрально
  if (vRole === pRole) return 1
  if (ROLE_CLUSTER[vRole] && ROLE_CLUSTER[vRole] === ROLE_CLUSTER[pRole]) return 0.6
  return 0.25
}

// ── Опыт (годы) ────────────────────────────────────────────────
function expFacet(vacancy: Vacancy, years?: number): { score: number; ok: boolean; label: string } {
  const from = vacancy.experienceFrom
  const to = vacancy.experienceTo
  if (from == null && to == null) return { score: 0.8, ok: true, label: 'без требований' }
  if (years == null) return { score: 0.7, ok: true, label: 'не указан' }
  const lo = from ?? 0
  const hi = to ?? Infinity
  if (years >= lo && years <= hi) return { score: 1, ok: true, label: `${years} ≈ требуемый` }
  if (years > hi) return { score: 0.9, ok: true, label: `${years} лет (с запасом)` }
  const deficit = lo - years
  return { score: Math.max(0.3, 1 - deficit * 0.25), ok: false, label: `${years} из ${lo}+ лет` }
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/**
 * Основной расчёт совпадения профиля и вакансии (лексический v1).
 * Складывается из: гейта по специальности × (навыки + ключевые слова + опыт).
 * Принимает либо MatchProfile, либо просто список навыков (обратная совместимость).
 */
export function computeMatch(vacancy: Vacancy, profileInput: MatchProfile | string[]): VacancyMatch {
  const profileRaw: MatchProfile = Array.isArray(profileInput) ? { skills: profileInput } : profileInput
  // Защита от частичных объектов (например, фолбэк-вакансия без requirements/conditions).
  const profile: MatchProfile = { ...profileRaw, skills: profileRaw.skills ?? [] }
  const vSkills = vacancy.skills ?? []
  const vReqs = vacancy.requirements ?? []
  const vConds = vacancy.conditions ?? []

  const profileEmpty =
    !profile.skills.length && !profile.jobTitle && !profile.about && !profile.experienceText
  const vacancyEmpty = !vSkills.length && !vReqs.length && !vConds.length
  if (profileEmpty || vacancyEmpty) return NULL_MATCH

  // 1) Навыки (с синонимами): доля требуемых навыков, закрытых профилем.
  const pSkillSet = new Set(profile.skills.map(canonSkill).filter(Boolean))
  const vSkillsCanon = vSkills.map(canonSkill).filter(Boolean)
  const matchedSkills = vSkills.filter((s) => pSkillSet.has(canonSkill(s)))
  const skillsRatio = vSkillsCanon.length ? matchedSkills.length / vSkillsCanon.length : 0

  // 2) Ключевые слова: токены вакансии (заголовок+требования+обязанности+навыки)
  //    против токенов профиля (должность+о себе+опыт+навыки).
  const vKw = stemSet(
    tokenize([vacancy.title ?? '', vReqs.join(' '), vConds.join(' '), vSkills.join(' ')].join(' ')),
  )
  const pKw = stemSet(
    tokenize(
      [profile.jobTitle ?? '', profile.about ?? '', profile.experienceText ?? '', profile.skills.join(' ')].join(' '),
    ),
  )
  let kwMatch = 0
  for (const k of vKw) if (pKw.has(k)) kwMatch++
  const kwRatio = vKw.size ? kwMatch / vKw.size : 0

  // 3) Опыт.
  const exp = expFacet(vacancy, profile.years)

  // 4) Специальность (гейт).
  const vRole = classifyRole(`${vacancy.title ?? ''} ${vSkills.join(' ')}`)
  const pRole = classifyRole(`${profile.jobTitle ?? ''} ${profile.skills.join(' ')}`)
  const gate = specialtyGate(vRole, pRole)

  // Свод: ядро 0..1, пол 0.20 (чтобы матч в своей сфере не выглядел как 5%), × гейт.
  const core = 0.5 * skillsRatio + 0.35 * kwRatio + 0.15 * exp.score
  const within = 0.2 + 0.8 * core
  const score = Math.max(0, Math.min(100, Math.round(100 * gate * within)))

  // Объяснение.
  const parts: string[] = []
  if (vRole && pRole && vRole === pRole) parts.push('специальность совпадает')
  else if (gate >= 0.6 && vRole && pRole) parts.push('смежная специальность')
  if (matchedSkills.length) parts.push(`${matchedSkills.length} из ${vSkills.length} ключевых навыков`)
  if (exp.ok && (vacancy.experienceFrom != null || vacancy.experienceTo != null) && profile.years != null)
    parts.push('опыт подходит')
  const why = cap(parts.join(' · '))

  const roleLabel =
    gate === 1 ? 'совпадает' : gate >= 0.6 ? 'смежная' : !vRole || !pRole ? '—' : 'другая'

  return {
    score,
    matchedSkills,
    why,
    breakdown: {
      role: { pct: Math.round(gate * 100), label: roleLabel },
      skills: { pct: Math.round(skillsRatio * 100), label: `${matchedSkills.length}/${vSkills.length}` },
      keywords: { pct: Math.round(kwRatio * 100), label: `${Math.round(kwRatio * 100)}%` },
      exp: { pct: Math.round(exp.score * 100), label: exp.label },
    },
  }
}

// ── Адаптеры профиля ───────────────────────────────────────────

/** Стаж в годах из элементов опыта (диапазон от самого раннего старта до последнего конца). */
export function estimateYears(items: { startYear?: number; endYear?: number; current?: boolean }[]): number | undefined {
  let minStart = Infinity
  let maxEnd = -Infinity
  const now = new Date().getFullYear()
  for (const it of items) {
    if (!it.startYear) continue
    minStart = Math.min(minStart, it.startYear)
    maxEnd = Math.max(maxEnd, it.current ? now : it.endYear ?? it.startYear)
  }
  if (minStart === Infinity) return undefined
  return Math.max(0, maxEnd - minStart)
}
