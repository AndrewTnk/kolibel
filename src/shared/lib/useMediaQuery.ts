import { useEffect, useState } from 'react'

/** Реактивный matchMedia-хук: true, пока медиа-запрос совпадает. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/**
 * Мобильный шелл (бургер + нижний таб-бар + горизонтальные карусели) включается
 * на ширине ≤980px — там же, где сетка схлопывается в одну колонку.
 * Держим число синхронным с медиа-запросами в CSS.
 */
export const MOBILE_QUERY = '(max-width: 980px)'

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY)
}
