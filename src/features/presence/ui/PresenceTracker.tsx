import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
import { store } from '../../../app/store/store'
import { presenceActions } from '../model/presenceSlice'

/** Как часто пишем свой last_seen_at (heartbeat), мс. */
const HEARTBEAT_MS = 60_000
/** Как часто перечитываем статусы видимых аккаунтов, мс. */
const PRESENCE_POLL_MS = 15_000
/** last_seen свежее этого окна → считаем аккаунт онлайн, мс (heartbeat 60с < окна). */
const ONLINE_WINDOW_MS = 90_000

type ProfileRow = { id: string; last_seen_at: string | null; show_activity: boolean | null }

/**
 * Невидимый компонент: отмечает пользователя онлайн и держит набор онлайн-аккаунтов.
 *
 * WebSocket-присутствие (Supabase Realtime) не проходит через Vercel-прокси из России
 * (см. CONTEXT_HANDOFF → «Доступ из России»), поэтому:
 *  - heartbeat: раз в минуту пишем свой `last_seen_at` (RPC `touch_last_seen`, миграция 0032);
 *  - «кто онлайн»: опрашиваем `last_seen_at` тех id, что СЕЙЧАС показаны на экране (реестр
 *    `presence.watched`, наполняется хуком `useIsOnline` из каждого `OnlineDot`), и считаем
 *    онлайн отметившихся недавно. Себя всегда считаем онлайн. Так статус работает ВЕЗДЕ —
 *    чат, любой профиль, рекомендации — где отрисован значок.
 *
 * Уважаем приватность: аккаунт с `show_activity=false` онлайн не показываем.
 * Опрос идёт только при активной вкладке; при появлении новых значков — быстрый до-опрос.
 */
export function PresenceTracker() {
  const dispatch = useAppDispatch()
  const userId = useAppSelector((s) => s.auth.user?.id)
  // Сигнатура набора наблюдаемых id — меняется, когда значки появляются/уходят с экрана.
  const watchedKey = useAppSelector((s) => Object.keys(s.presence.watched).sort().join(','))

  const refresh = useCallback(async () => {
    if (!userId) return
    const ids = Object.keys(store.getState().presence.watched).filter((x) => x && x !== userId)
    const online = new Set<string>([userId]) // я сам онлайн, пока приложение открыто
    if (ids.length) {
      const { data } = await supabase
        .from('profiles')
        .select('id, last_seen_at, show_activity')
        .in('id', ids)
      const now = Date.now()
      for (const p of (data ?? []) as ProfileRow[]) {
        if (p.show_activity === false) continue // аккаунт скрыл активность
        if (p.last_seen_at && now - new Date(p.last_seen_at).getTime() < ONLINE_WINDOW_MS) {
          online.add(p.id)
        }
      }
    }
    dispatch(presenceActions.setOnlineIds([...online]))
  }, [userId, dispatch])

  // Heartbeat (всегда) + периодический опрос статусов (только при активной вкладке).
  useEffect(() => {
    if (!userId) {
      dispatch(presenceActions.setOnlineIds([]))
      return
    }
    const touch = () => {
      void supabase.rpc('touch_last_seen')
    }
    touch()
    const heartbeat = window.setInterval(touch, HEARTBEAT_MS)

    let poll: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (poll) return
      void refresh()
      poll = setInterval(() => void refresh(), PRESENCE_POLL_MS)
    }
    const stop = () => {
      if (poll) clearInterval(poll)
      poll = null
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(heartbeat)
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      dispatch(presenceActions.setOnlineIds([]))
    }
  }, [userId, dispatch, refresh])

  // Быстрый до-опрос при смене набора значков (открыл чат/профиль → статус почти сразу).
  useEffect(() => {
    if (!userId || document.visibilityState !== 'visible') return
    const t = window.setTimeout(() => void refresh(), 300)
    return () => window.clearTimeout(t)
  }, [userId, watchedKey, refresh])

  return null
}
