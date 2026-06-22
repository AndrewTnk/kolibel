import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
import { store } from '../../../app/store/store'
import { chatActions } from '../model/chatSlice'
import { selectViewedConversationId } from '../model/chatUiSlice'
import { loadConversations, markConversationRead } from '../model/chatThunks'
import { rowToMessage, type MessageRow } from '../lib/mapChat'

/**
 * Невидимый компонент: при входе грузит беседы и подписывается на новые сообщения
 * (Supabase Realtime). Входящие сообщения добавляются в стор мгновенно.
 * Realtime уважает RLS — придут только сообщения наших бесед.
 */
export function ChatRealtime() {
  const dispatch = useAppDispatch()
  const userId = useAppSelector((s) => s.auth.user?.id)

  useEffect(() => {
    if (!userId) return

    void dispatch(loadConversations())

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as MessageRow & { conversation_id: string }
          const convId = row.conversation_id
          const state = store.getState()
          const known = state.chat.conversations.some((c) => c.id === convId)
          if (!known) {
            // беседа создана собеседником только что — подтягиваем список целиком
            void dispatch(loadConversations())
            return
          }
          const message = rowToMessage(row, userId)
          // Беседа открыта прямо сейчас (страница/модалка/мини) → не считаем непрочитанным.
          const active = selectViewedConversationId(state) === convId
          dispatch(chatActions.appendMessage({ conversationId: convId, message, active }))
          // Открытую беседу сразу помечаем прочитанной (и в БД — для галочек у собеседника).
          if (message.sender === 'them' && active) {
            void dispatch(markConversationRead(convId))
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          // Собеседник отредактировал сообщение → обновляем текст в realtime.
          const row = payload.new as { id?: string; conversation_id?: string; body?: string }
          if (!row?.id || !row.conversation_id) return
          dispatch(
            chatActions.updateMessageText({
              conversationId: row.conversation_id,
              messageId: row.id,
              text: row.body ?? '',
            }),
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          // Собеседник удалил сообщение → убираем из стора в realtime.
          const old = payload.old as { id?: string; conversation_id?: string }
          if (!old?.id) return
          dispatch(
            chatActions.removeMessage({ conversationId: old.conversation_id, messageId: old.id }),
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversation_participants' },
        (payload) => {
          // Собеседник обновил last_read_at → прочитал мои сообщения. Ставим галочки
          // «прочитано» в realtime (раньше обновлялось только при перезагрузке списка).
          const row = payload.new as {
            conversation_id: string
            user_id: string
            last_read_at: string | null
          }
          if (!row || row.user_id === userId) return // своё прочтение игнорируем
          const readAt = row.last_read_at ? new Date(row.last_read_at).getTime() : 0
          if (!readAt) return
          dispatch(chatActions.applyOtherRead({ conversationId: row.conversation_id, readAt }))
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, dispatch])

  return null
}
