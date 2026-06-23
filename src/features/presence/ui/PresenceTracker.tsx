import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
import { presenceActions } from '../model/presenceSlice'

/**
 * Невидимый компонент: пока пользователь авторизован и приложение открыто —
 * присоединяется к глобальному presence-каналу (Supabase Realtime) под своим id
 * и отслеживает набор онлайн-аккаунтов. Ключ присутствия = user id, поэтому
 * `presenceState()` отдаёт онлайн-id напрямую. Смонтирован в `App.tsx`.
 */
export function PresenceTracker() {
  const dispatch = useAppDispatch()
  const userId = useAppSelector((s) => s.auth.user?.id)

  useEffect(() => {
    if (!userId) {
      dispatch(presenceActions.setOnlineIds([]))
      return
    }

    const channel = supabase.channel('online-users', {
      config: { presence: { key: userId } },
    })

    const syncIds = () => {
      const state = channel.presenceState()
      dispatch(presenceActions.setOnlineIds(Object.keys(state)))
    }

    // Heartbeat: пишем last_seen_at в БД (для «был(а) N назад»). RPC обновляет
    // только last_seen_at и не дёргает updated_at профиля (см. миграцию 0032).
    const touch = () => {
      void supabase.rpc('touch_last_seen')
    }

    channel
      .on('presence', { event: 'sync' }, syncIds)
      .on('presence', { event: 'join' }, syncIds)
      .on('presence', { event: 'leave' }, syncIds)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ online_at: new Date().toISOString() })
          touch()
        }
      })

    const heartbeat = window.setInterval(touch, 60_000)

    return () => {
      window.clearInterval(heartbeat)
      void channel.untrack()
      void supabase.removeChannel(channel)
    }
  }, [userId, dispatch])

  return null
}
