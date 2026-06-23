import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
import { store } from '../../../app/store/store'
import { selectViewedConversationId } from '../../chat/model/chatUiSlice'
import { notificationsActions, isKindEnabled } from '../model/notificationsSlice'
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
          const state = store.getState()
          // Отключённый в настройках тип — не показываем (ни в списке, ни тостом).
          if (!isKindEnabled(state.notifications.prefs, notif.kind)) return
          // Если это сообщение из беседы, которую пользователь СЕЙЧАС открыл —
          // он уже видит сообщение, тост не нужен (помечаем уведомление прочитанным).
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
