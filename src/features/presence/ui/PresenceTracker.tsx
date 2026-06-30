import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
import { store } from '../../../app/store/store'
import { presenceActions } from '../model/presenceSlice'

/** Как часто пишем свой last_seen_at (heartbeat), мс. */
const HEARTBEAT_MS = 60_000
/** Как часто перечитываем, кто из собеседников онлайн, мс (presence не нужен мгновенным). */
const PRESENCE_POLL_MS = 30_000
/** last_seen свежее этого окна → считаем аккаунт онлайн, мс. */
const ONLINE_WINDOW_MS = 90_000

/**
 * Невидимый компонент: отмечает пользователя онлайн и собирает набор онлайн-аккаунтов.
 *
 * Раньше присутствие шло через Supabase Realtime Presence (WebSocket), но он не проходит
 * через Vercel-прокси из России (см. CONTEXT_HANDOFF → «Доступ из России»). Теперь:
 *  - heartbeat: раз в минуту пишем свой `last_seen_at` (RPC `touch_last_seen`, миграция 0032);
 *  - «кто онлайн»: периодически читаем `last_seen_at` СОБЕСЕДНИКОВ из чата и считаем онлайн тех,
 *    кто отметился недавно (значок «в сети» нужен в основном в чате); себя всегда считаем онлайн.
 *
 * ⚠️ Значок онлайн на ЧУЖОМ профиле, с кем нет переписки, теперь не подсветится (его id нет в
 * опрашиваемом наборе) — для MVP приемлемо. Опрос работает только при активной вкладке.
 */
export function PresenceTracker() {
  const dispatch = useAppDispatch()
  const userId = useAppSelector((s) => s.auth.user?.id)

  useEffect(() => {
    if (!userId) {
      dispatch(presenceActions.setOnlineIds([]))
      return
    }

    const touch = () => {
      void supabase.rpc('touch_last_seen')
    }

    const refresh = async () => {
      touch() // заодно обновляем себя
      const convos = store.getState().chat.conversations
      const ids = [...new Set(convos.map((c) => c.otherId).filter((x): x is string => !!x))]
      const online = new Set<string>([userId]) // я сам онлайн, пока приложение открыто
      if (ids.length) {
        const { data } = await supabase.from('profiles').select('id, last_seen_at').in('id', ids)
        const now = Date.now()
        for (const p of (data ?? []) as { id: string; last_seen_at: string | null }[]) {
          if (p.last_seen_at && now - new Date(p.last_seen_at).getTime() < ONLINE_WINDOW_MS) {
            online.add(p.id)
          }
        }
      }
      dispatch(presenceActions.setOnlineIds([...online]))
    }

    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (timer) return
      void refresh()
      timer = setInterval(() => void refresh(), PRESENCE_POLL_MS)
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

    // Heartbeat идёт всегда (раз в минуту, дёшево) — чтобы «был(а) N назад» был свежим.
    const heartbeat = window.setInterval(touch, HEARTBEAT_MS)
    touch()

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(heartbeat)
      dispatch(presenceActions.setOnlineIds([]))
    }
  }, [userId, dispatch])

  return null
}
