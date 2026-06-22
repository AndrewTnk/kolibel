import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ChatConversation, ChatMessage } from './types'
import { loadConversations } from './chatThunks'

type ChatStatus = 'idle' | 'loading' | 'ready' | 'error'

type ChatState = {
  conversations: ChatConversation[]
  status: ChatStatus
}

const initialState: ChatState = {
  conversations: [],
  status: 'idle',
}

const slice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    /** Добавить сообщение в беседу (используется и оптимистичной отправкой, и realtime).
     *  `active` — беседа сейчас открыта у пользователя → не наращиваем непрочитанное. */
    appendMessage(
      state,
      action: PayloadAction<{ conversationId: string; message: ChatMessage; active?: boolean }>,
    ) {
      const { conversationId, message, active } = action.payload
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (!conv) return // беседы ещё нет в сторе — realtime-обработчик перезагрузит список
      if (conv.messages.some((m) => m.id === message.id)) return // дедуп (id уже есть)
      conv.messages.push(message)
      conv.updatedAt = message.createdAt
      if (message.sender === 'them' && !active) conv.unreadCount = (conv.unreadCount ?? 0) + 1
      state.conversations.sort((a, b) => b.updatedAt - a.updatedAt)
    },
    /** Собеседник прочитал мои сообщения (его last_read_at обновился) — ставим галочки
     *  «прочитано» на мои сообщения до этого времени (realtime read receipts). */
    applyOtherRead(
      state,
      action: PayloadAction<{ conversationId: string; readAt: number }>,
    ) {
      const conv = state.conversations.find((c) => c.id === action.payload.conversationId)
      if (!conv) return
      for (const m of conv.messages) {
        if (m.sender === 'me' && !m.readAt && m.createdAt <= action.payload.readAt) {
          m.readAt = action.payload.readAt
        }
      }
    },
    /** Сбросить счётчик непрочитанного у беседы. */
    markRead(state, action: PayloadAction<string>) {
      const conv = state.conversations.find((c) => c.id === action.payload)
      if (conv) conv.unreadCount = 0
    },
    /** Удалить беседу из стора (оптимистично при удалении). */
    removeConversation(state, action: PayloadAction<string>) {
      state.conversations = state.conversations.filter((c) => c.id !== action.payload)
    },
    /** Оптимистичный тоггл реакции на сообщении. */
    toggleReactionLocal(
      state,
      action: PayloadAction<{ conversationId: string; messageId: string; emoji: string }>,
    ) {
      const { conversationId, messageId, emoji } = action.payload
      const conv = state.conversations.find((c) => c.id === conversationId)
      const msg = conv?.messages.find((m) => m.id === messageId)
      if (!msg) return
      const list = msg.reactions ? [...msg.reactions] : []
      const idx = list.findIndex((r) => r.em === emoji)
      if (idx === -1) {
        list.push({ em: emoji, count: 1, mine: true })
      } else {
        const r = list[idx]
        if (r.mine) {
          const count = r.count - 1
          if (count <= 0) list.splice(idx, 1)
          else list[idx] = { ...r, count, mine: false }
        } else {
          list[idx] = { ...r, count: r.count + 1, mine: true }
        }
      }
      msg.reactions = list.length ? list : undefined
    },
    /** Флаги беседы (закрепление / без звука). */
    setConversationFlags(
      state,
      action: PayloadAction<{ conversationId: string; pinned?: boolean; muted?: boolean }>,
    ) {
      const conv = state.conversations.find((c) => c.id === action.payload.conversationId)
      if (!conv) return
      if (action.payload.pinned !== undefined) conv.pinned = action.payload.pinned
      if (action.payload.muted !== undefined) conv.muted = action.payload.muted
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadConversations.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loadConversations.fulfilled, (state, action) => {
        state.status = 'ready'
        state.conversations = action.payload
      })
      .addCase(loadConversations.rejected, (state) => {
        state.status = 'error'
      })
  },
})

export const chatReducer = slice.reducer
export const chatActions = slice.actions
