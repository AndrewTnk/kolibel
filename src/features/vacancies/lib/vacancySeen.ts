/**
 * Просмотренные мной вакансии — для чек-бокса «Скрыть просмотренные мной вакансии».
 * Храним множество id в localStorage (на устройство), помечаем при открытии вакансии
 * (incrementVacancyView). Не зависит от аккаунта — это вспомогательный UX-фильтр.
 */

const KEY = 'kolibel:vacancySeen'

export function loadVacancySeen(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function markVacancySeen(id: string): void {
  try {
    const set = loadVacancySeen()
    if (set.has(id)) return
    set.add(id)
    localStorage.setItem(KEY, JSON.stringify([...set]))
    // Чтобы подписчики (страница вакансий) узнали об изменении в той же вкладке.
    window.dispatchEvent(new Event('kolibel:vacancySeen'))
  } catch {
    /* no-op */
  }
}
