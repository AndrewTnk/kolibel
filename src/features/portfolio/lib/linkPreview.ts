/**
 * Авто-превью ссылок портфолио, без серверного кода. Порядок источников:
 * своя обложка (coverUrl) → OG-картинка GitHub → скриншот mShots через
 * прокси /shot (Vercel/Vite, как /sb) → градиент + фавиконка + домен.
 */

/** Домен ссылки без www (для подписи и фавиконки). */
export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** Официальная OG-картинка репозитория GitHub (без ключей). */
export function githubPreview(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname !== 'github.com' && u.hostname !== 'www.github.com') return null
    const [owner, repo] = u.pathname.split('/').filter(Boolean)
    if (!owner || !repo) return null
    return `https://opengraph.githubassets.com/1/${owner}/${repo}`
  } catch {
    return null
  }
}

/**
 * Скриншот сайта через mShots (WordPress) — проксируется через /shot.
 * `attempt` добавляет cache-buster: пока скриншот генерируется, mShots отдаёт
 * гиф-заглушку меньшего размера — перезапрашиваем через пару секунд.
 */
export function shotUrl(url: string, attempt = 0): string {
  return `/shot/${encodeURIComponent(url)}?w=1200${attempt ? `&r=${attempt}` : ''}`
}

/** Фавиконка домена (сервис Яндекса — доступен из РФ без прокси). */
export function faviconUrl(url: string): string | null {
  const d = domainOf(url)
  return d ? `https://favicon.yandex.net/favicon/${d}` : null
}

/** Нормализация ссылки из формы: дописываем https://, если схемы нет. */
export function normalizeLink(raw: string): string {
  const s = raw.trim()
  if (!s) return s
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

/** Валидная ли ссылка (после нормализации): http(s) и домен с точкой. */
export function isValidLink(raw: string): boolean {
  try {
    const u = new URL(normalizeLink(raw))
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.')
  } catch {
    return false
  }
}
