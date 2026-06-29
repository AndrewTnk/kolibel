/**
 * Ссылка для контакта по его типу (label) и введённому значению.
 * Возвращает абсолютный URL (или mailto:) — либо '' если ссылка не нужна/невозможна.
 *
 * Важно: НИКОГДА не возвращаем «голое» значение (напр. `ivan123`) — иначе в <a href>
 * браузер трактует его как относительный путь и уводит «хрен знает куда».
 * Если по значению нельзя собрать корректную ссылку — возвращаем '' (контакт не кликабельный).
 */
export function contactHref(label: string, value: string): string {
  const v = (value ?? '').trim()
  if (!v) return ''
  const l = (label ?? '').toLowerCase()

  // Телефон — намеренно без ссылки (по решению владельца).
  if (l.includes('телефон') || l.includes('phone') || l.includes('тел')) return ''

  // Уже готовая ссылка — используем как есть.
  if (/^(https?:\/\/|mailto:|tel:)/i.test(v)) return v

  const handle = v.replace(/^@/, '')
  const asUrl = (s: string) => `https://${s.replace(/^https?:\/\//i, '')}`

  if (l.includes('mail') || l.includes('почт') || l.includes('email')) return `mailto:${v}`
  if (l.includes('tg') || l.includes('telegram') || l.includes('телеграм')) return `https://t.me/${handle}`
  if (l.includes('vk') || l.includes('вконтакте')) return v.includes('vk.com') ? asUrl(v) : `https://vk.com/${handle}`
  if (l.includes('max') || l.includes('макс')) return v.includes('max.ru') ? asUrl(v) : `https://max.ru/${handle}`
  if (l.includes('git')) return v.includes('github.com') ? asUrl(v) : `https://github.com/${handle}`
  if (l.includes('сайт') || l.includes('site') || l.includes('web') || l.includes('портфол'))
    return v.includes('.') ? asUrl(v) : ''

  // Неизвестный тип: похоже на домен → http(s); иначе без ссылки (без относительной навигации).
  if (/\.[a-z]{2,}/i.test(v)) return asUrl(v)
  return ''
}
