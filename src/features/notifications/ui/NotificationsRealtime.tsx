import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { loadNotifications, pollNewNotifications } from '../model/notificationsThunks'

/** Интервал опроса уведомлений, мс (как у чата — 2с). */
const POLL_MS = 2000

/**
 * Невидимый компонент: при входе грузит уведомления и держит их свежими ОПРОСОМ.
 *
 * Раньше тут была realtime-подписка на `notifications` (WebSocket), но он не проходит
 * через Vercel-прокси из России (см. CONTEXT_HANDOFF → «Доступ из России»). Поэтому
 * новые уведомления добираются лёгким поллингом `pollNewNotifications` (бейдж + тост).
 *
 * Опрашиваем только при активной вкладке — фоновая вкладка не нагружает бэкенд.
 */
export function NotificationsRealtime() {
  const dispatch = useAppDispatch()
  const userId = useAppSelector((s) => s.auth.user?.id)

  useEffect(() => {
    if (!userId) return

    void dispatch(loadNotifications())

    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (timer) return
      void dispatch(pollNewNotifications())
      timer = setInterval(() => void dispatch(pollNewNotifications()), POLL_MS)
    }
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [userId, dispatch])

  return null
}
