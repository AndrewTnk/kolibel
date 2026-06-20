import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
import { store } from '../../../app/store/store'
import { chatActions } from '../model/chatSlice'
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
          dispatch(chatActions.appendMessage({ conversationId: convId, message }))

          // если эта беседа сейчас открыта — сразу помечаем прочитанной
          const ui = state.chatUi
          const isActive =
            ui.activeConversationId === convId &&
            (ui.modalOpen || (ui.miniOpen && ui.miniView === 'chat'))
          if (message.sender === 'them' && isActive) {
            void dispatch(markConversationRead(convId))
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, dispatch])

  return null
}
