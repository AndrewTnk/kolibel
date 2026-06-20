/**
 * «Избранные» кандидаты (по id отклика) — для фильтра Все/Избранные/Отказ на
 * странице «Мои вакансии». Пока хранится в localStorage (мгновенно, без миграции,
 * но локально для браузера). TODO: при желании вынести в колонку
 * `vacancy_applications.favorite` (RLS на владельца вакансии уже есть из 0013).
 */

const KEY = 'kolibel:favApplicants'

export function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function saveFavorites(set: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {
    /* no-op */
  }
}
