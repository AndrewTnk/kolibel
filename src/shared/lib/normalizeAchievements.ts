/**
 * Достижения места работы теперь хранятся как markdown-строка (редактор RichEditor).
 * Старые профили хранят массив строк — склеиваем в markdown-список для обратной
 * совместимости (каждый пункт → «- …»). Возвращает markdown-строку.
 */
export function normalizeAchievements(a: unknown): string {
  if (typeof a === 'string') return a
  if (Array.isArray(a)) {
    return a
      .map((x) => String(x).trim())
      .filter(Boolean)
      .map((x) => (/^\s*[-*]/.test(x) ? x : `- ${x}`))
      .join('\n')
  }
  return ''
}
