import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
import { notificationsActions } from '../model/notificationsSlice'
import { loadNotifications, rowToNotification, type NotificationRow } from '../model/notificationsThunks'

/**
 * Невидимый компонент: при входе грузит уведомления и подписывается на новые
 * (Supabase Realtime, уважает RLS — придут только свои). Бейдж обновляется мгновенно.
 */
export function NotificationsRealtime() {
  const dispatch = useAppDispatch()
  const userId = useAppSelector((s) => s.auth.user?.id)

  useEffect(() => {
    if (!userId) return

    void dispatch(loadNotifications())

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          dispatch(notificationsActions.prepend(rowToNotification(payload.new as NotificationRow)))
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, dispatch])

  return null
}
