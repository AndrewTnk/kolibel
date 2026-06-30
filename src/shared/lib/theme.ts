/** Тема оформления. Только светлая и тёмная (системной нет). */
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'kolibel:theme'

/** Прочитать сохранённую тему (по умолчанию — светлая). */
export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** Применить тему к документу (data-theme на <html>) + обновить meta theme-color. */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff')
}

/** Сохранить и применить тему. */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
  applyTheme(theme)
}

/** Инициализация при старте приложения. */
export function initTheme() {
  applyTheme(getStoredTheme())
}
