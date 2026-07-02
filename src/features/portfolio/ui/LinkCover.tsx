import { useEffect, useMemo, useRef, useState } from 'react'
import { domainOf, faviconUrl, githubPreview, shotUrl } from '../lib/linkPreview'
import s from './Portfolio.module.css'

/** Сколько раз перезапрашиваем скриншот, пока mShots его генерирует. */
const SHOT_ATTEMPTS = 4
const SHOT_RETRY_MS = 3500
/** Реальный скриншот приходит шириной ~1200 (мы просим w=1200); заглушка-гиф — заметно уже. */
const SHOT_MIN_WIDTH = 900

/** Пастельный градиент-фолбэк, детерминированный по ссылке. */
function fallbackGradient(key: string): string {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 72% 92%), hsl(${(h + 42) % 360} 64% 84%))`
}

/**
 * Обложка карточки-ссылки. Источники по приоритету: своя обложка (coverUrl) →
 * OG-картинка GitHub → скриншот сайта (mShots через /shot, с повторами на время
 * генерации) → градиент + фавиконка + домен (никогда не «ломается»).
 */
export function LinkCover({ url, coverUrl }: { url: string; coverUrl?: string }) {
  const sources = useMemo(() => {
    const list: string[] = []
    if (coverUrl) list.push(coverUrl)
    const gh = githubPreview(url)
    if (gh) list.push(gh)
    list.push(shotUrl(url))
    return list
  }, [url, coverUrl])

  const [srcIdx, setSrcIdx] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const timerRef = useRef<number | null>(null)

  // Смена ссылки → начинаем цепочку источников заново.
  useEffect(() => {
    setSrcIdx(0)
    setAttempt(0)
    setFailed(false)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [sources])

  const current = sources[srcIdx]
  const isShot = !!current && current.startsWith('/shot/')
  const src = isShot ? shotUrl(url, attempt) : current

  function retryShot() {
    timerRef.current = window.setTimeout(() => setAttempt((a) => a + 1), SHOT_RETRY_MS)
  }

  function nextSource() {
    if (srcIdx + 1 < sources.length) {
      setSrcIdx(srcIdx + 1)
      setAttempt(0)
    } else {
      setFailed(true)
    }
  }

  if (failed || !current) {
    const fav = faviconUrl(url)
    const dom = domainOf(url)
    return (
      <div className={s.coverFallback} style={{ background: fallbackGradient(url) }}>
        <div className={s.coverFallbackInner}>
          {fav ? (
            <img
              className={s.coverFavicon}
              src={fav}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : null}
          {dom ? <span className={s.coverDomain}>{dom}</span> : null}
        </div>
      </div>
    )
  }

  return (
    <img
      className={s.coverImg}
      src={src}
      alt=""
      loading="lazy"
      onLoad={(e) => {
        // Заглушка «генерируется» от mShots — маленькая картинка: ждём и перезапрашиваем.
        const w = e.currentTarget.naturalWidth
        if (isShot && w > 0 && w < SHOT_MIN_WIDTH) {
          if (attempt < SHOT_ATTEMPTS) retryShot()
          else nextSource()
        }
      }}
      onError={() => {
        // Скриншот мог не успеть сгенерироваться (307 на заглушку) — повторяем, потом фолбэк.
        if (isShot && attempt < SHOT_ATTEMPTS) retryShot()
        else nextSource()
      }}
    />
  )
}
