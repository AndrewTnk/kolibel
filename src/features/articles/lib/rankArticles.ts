import type { Article } from '../model/types'

/** Детерминированный хэш строки → [0, 1). */
function hashUnit(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

/** Сегодняшний seed (YYYY-M-D) — раз в сутки меняет дневной джиттер. */
export function todaySeed(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * Лёгкая «рекомендательная» сортировка статей для общей ленты:
 * популярность (просмотры) + свежесть + детерминированный дневной джиттер.
 *
 * Джиттер привязан к дате (`seed`), поэтому порядок топа обновляется раз в день
 * и одна и та же статья не висит на первом месте постоянно. При этом популярные
 * и свежие статьи в среднем держатся выше.
 */
export function rankArticlesDaily(list: Article[], seed = todaySeed()): Article[] {
  const maxViews = Math.max(1, ...list.map((a) => a.views || 0))
  const logMax = Math.log(maxViews + 1)
  const now = Date.now()

  const score = (a: Article) => {
    const pop = Math.log((a.views || 0) + 1) / logMax // 0..1
    const ageDays = (now - (a.publishedAt ?? a.createdAt)) / 86_400_000
    const recency = Math.max(0, 1 - ageDays / 30) // 0..1, гаснет за 30 дней
    const jitter = hashUnit(a.id + seed) // 0..1, стабилен в течение суток
    return pop * 0.5 + recency * 0.2 + jitter * 0.3
  }

  return [...list].sort((a, b) => score(b) - score(a))
}
