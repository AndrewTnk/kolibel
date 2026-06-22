import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
import { store } from '../../../app/store/store'
import { selectViewedConversationId } from '../../chat/model/chatUiSlice'
import { notificationsActions } from '../model/notificationsSlice'
import {
  loadNotifications,
  markNotificationRead,
  rowToNotification,
  enrichNotificationAvatars,
  type NotificationRow,
} from '../model/notificationsThunks'

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
          const notif = rowToNotification(payload.new as NotificationRow)
          // Если это сообщение из беседы, которую пользователь СЕЙЧАС открыл —
          // он уже видит сообщение, тост не нужен (помечаем уведомление прочитанным).
          const state = store.getState()
          const viewedId = selectViewedConversationId(state)
          const viewedConv = viewedId
            ? state.chat.conversations.find((c) => c.id === viewedId)
            : null
          const inOpenChat =
            notif.kind === 'message' && !!viewedConv?.otherId && notif.actorId === viewedConv.otherId
          // Дотягиваем аватар актора, затем добавляем в список и (если нужно) показываем пуш-тост.
          void enrichNotificationAvatars([notif]).then(() => {
            dispatch(notificationsActions.prepend(notif))
            if (inOpenChat) {
              void dispatch(markNotificationRead(notif.id))
            } else {
              dispatch(notificationsActions.pushToast(notif))
            }
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, dispatch])

  return null
}
