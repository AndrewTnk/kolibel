import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import { chatActions } from './chatSlice'
import type { ChatAttach, ChatConversation, ChatMessage } from './types'
import {
  rowToConversation,
  rowToMessage,
  type ConversationRow,
  type MessageRow,
} from '../lib/mapChat'
import { selectViewedConversationId } from './chatUiSlice'
import type { RootState } from '../../../app/store/store'

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

/**
 * Имя/аватар у собеседников-компаний живут в таблице `companies` (id компании = id профиля),
 * а не в `profiles.full_name` (он у компаний часто пуст → заголовок падал в «Пользователь»).
 * Дотягиваем их одним запросом — как `enrichAuthors` в ленте.
 */
async function enrichCompanyTitles(convos: ChatConversation[]): Promise<void> {
  const ids = [...new Set(convos.map((c) => c.otherId).filter(Boolean) as string[])]
  if (!ids.length) return
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, avatar_url')
    .in('id', ids)
  if (error || !data) return
  const byId = new Map(
    (data as { id: string; name: string | null; logo_url: string | null; avatar_url: string | null }[]).map(
      (c) => [c.id, c],
    ),
  )
  for (const c of convos) {
    const comp = c.otherId ? byId.get(c.otherId) : undefined
    if (!comp) continue
    c.type = 'company'
    const name = comp.name?.trim()
    if (name) c.title = name
    const ava = comp.logo_url?.trim() || comp.avatar_url?.trim()
    if (ava) c.avatar = ava
  }
}

// Полный SELECT (после миграции 0019) и базовый (на случай непримененной миграции).
const SELECT_FULL =
  'id, last_message_at, kind, conversation_participants ( user_id, last_read_at, pinned, muted, profiles ( full_name, job_title, avatar_url, account_type, job_status, status ) ), messages ( id, sender_id, body, created_at, reply_to, attach, reactions )'
const SELECT_BASE =
  'id, last_message_at, conversation_participants ( user_id, last_read_at, profiles ( full_name, job_title, avatar_url, account_type, job_status, status ) ), messages ( id, sender_id, body, created_at )'

/** Загрузка всех бесед текущего пользователя (с участниками и сообщениями). */
export const loadConversations = createAsyncThunk<ChatConversation[], void>(
  'chat/load',
  async () => {
    const myId = await currentUserId()
    if (!myId) return []
    const full = await supabase
      .from('conversations')
      .select(SELECT_FULL)
      .order('last_message_at', { ascending: false })
    let rows: ConversationRow[]
    if (full.error) {
      // Миграция 0019 ещё не применена — грузим без новых полей.
      const base = await supabase
        .from('conversations')
        .select(SELECT_BASE)
        .order('last_message_at', { ascending: false })
      if (base.error) throw new Error(base.error.message)
      rows = base.data as unknown as ConversationRow[]
    } else {
      rows = full.data as unknown as ConversationRow[]
    }
    const convos = rows.map((r) => rowToConversation(r, myId))
    await enrichCompanyTitles(convos)
    return convos
  },
)

/**
 * Гарантирует наличие системной беседы «Поддержка Kolibel» (создаёт её + приветствие
 * при первом вызове). Идемпотентно. Зовём один раз при входе (перед loadConversations).
 */
export const ensureSupportConversation = createAsyncThunk<void, void>(
  'chat/ensureSupport',
  async () => {
    const myId = await currentUserId()
    if (!myId) return
    // Если миграция 0046 ещё не применена — RPC не существует; молча пропускаем.
    await supabase.rpc('ensure_support_conversation')
  },
)

/**
 * Лёгкий опрос новых сообщений — замена realtime-подписки на messages (WebSocket
 * не проходит через Vercel-прокси из РФ, см. раздел про прокси в CONTEXT_HANDOFF).
 *
 * Не перезагружает беседы целиком (это бы перерисовывало весь чат и дёргало скролл).
 * Берёт только сообщения, созданные ПОЗЖЕ последнего известного, и докидывает их
 * через `appendMessage` (с дедупом). Плюс для открытой беседы дотягивает last_read_at
 * собеседника (галочки «прочитано»). Обычно запрос возвращает 0 строк → почти бесплатно.
 *
 * ⚠️ Правки/удаления сообщений собеседником этим опросом НЕ ловятся (инкрементально их
 * не отличить) — отразятся при следующей полной перезагрузке (переход/отправка). Для MVP ок.
 */
export const pollNewMessages = createAsyncThunk<void, void>(
  'chat/poll',
  async (_, { dispatch, getState }) => {
    const myId = await currentUserId()
    if (!myId) return
    const state = getState() as RootState
    const convos = state.chat.conversations
    if (state.chat.status !== 'ready') return // ждём первичную загрузку (loadConversations)

    // Последний известный момент среди всех сообщений — точка отсчёта опроса.
    let since = 0
    for (const c of convos) for (const m of c.messages) if (m.createdAt > since) since = m.createdAt
    const sinceIso = new Date(since || 0).toISOString()

    // Новые сообщения МОИХ бесед (RLS messages_select ограничивает только участниками).
    const sel = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, body, created_at, reply_to, attach, reactions')
      .gt('created_at', sinceIso)
      .order('created_at', { ascending: true })
    let rows: (MessageRow & { conversation_id: string })[]
    if (sel.error) {
      // Фолбэк без полей 0019.
      const base = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, created_at')
        .gt('created_at', sinceIso)
        .order('created_at', { ascending: true })
      if (base.error) return
      rows = base.data as unknown as (MessageRow & { conversation_id: string })[]
    } else {
      rows = sel.data as unknown as (MessageRow & { conversation_id: string })[]
    }

    const known = new Set(convos.map((c) => c.id))
    const viewedId = selectViewedConversationId(state)
    let needFullReload = false
    for (const row of rows) {
      if (!known.has(row.conversation_id)) {
        // Беседа создана собеседником только что — её ещё нет в сторе.
        needFullReload = true
        continue
      }
      const message = rowToMessage(row, myId)
      const active = viewedId === row.conversation_id
      dispatch(chatActions.appendMessage({ conversationId: row.conversation_id, message, active }))
      if (message.sender === 'them' && active) void dispatch(markConversationRead(row.conversation_id))
    }
    if (needFullReload) {
      void dispatch(loadConversations())
      return
    }

    // Галочки прочтения: дотянуть last_read_at собеседника для открытой беседы.
    if (viewedId) {
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id, last_read_at')
        .eq('conversation_id', viewedId)
      if (parts) {
        for (const p of parts as { user_id: string; last_read_at: string | null }[]) {
          if (p.user_id === myId || !p.last_read_at) continue
          const readAt = new Date(p.last_read_at).getTime()
          if (readAt) dispatch(chatActions.applyOtherRead({ conversationId: viewedId, readAt }))
        }
      }
    }
  },
)

type SendArgs = {
  conversationId: string
  text: string
  replyTo?: ChatMessage['replyTo']
  attach?: ChatAttach | null
}

/** Отправка сообщения (+ необязательные reply/attach). */
export const sendMessage = createAsyncThunk<
  { conversationId: string; message: ChatMessage } | null,
  SendArgs
>('chat/send', async ({ conversationId, text, replyTo, attach }, { dispatch }) => {
  const t = text.trim()
  if (!t && !attach) return null
  const myId = await currentUserId()
  if (!myId) throw new Error('Нет активной сессии')

  const payload: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: myId,
    body: t,
    reply_to: replyTo ?? null,
    attach: attach ?? null,
  }
  const full = await supabase
    .from('messages')
    .insert(payload)
    .select('id, sender_id, body, created_at, reply_to, attach, reactions')
    .single()
  let row: MessageRow
  if (full.error) {
    // Без полей 0019 (миграция не применена).
    const base = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: myId, body: t })
      .select('id, sender_id, body, created_at')
      .single()
    if (base.error) throw new Error(base.error.message)
    row = base.data as unknown as MessageRow
  } else {
    row = full.data as unknown as MessageRow
  }
  const message = rowToMessage(row, myId)
  dispatch(chatActions.appendMessage({ conversationId, message }))
  return { conversationId, message }
})

/** Удалить своё сообщение (оптимистично + RLS messages_delete_own из 0031). */
export const deleteMessage = createAsyncThunk<
  void,
  { conversationId: string; messageId: string }
>('chat/deleteMessage', async ({ conversationId, messageId }, { dispatch }) => {
  const myId = await currentUserId()
  if (!myId) throw new Error('Нет активной сессии')
  dispatch(chatActions.removeMessage({ conversationId, messageId }))
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', myId)
  if (error) {
    await dispatch(loadConversations()) // откат к актуальному состоянию
    throw new Error(error.message)
  }
})

/** Изменить текст своего сообщения (оптимистично + RLS messages_update_own из 0031). */
export const editMessage = createAsyncThunk<
  void,
  { conversationId: string; messageId: string; text: string }
>('chat/editMessage', async ({ conversationId, messageId, text }, { dispatch }) => {
  const myId = await currentUserId()
  if (!myId) throw new Error('Нет активной сессии')
  const t = text.trim()
  if (!t) return
  dispatch(chatActions.updateMessageText({ conversationId, messageId, text: t }))
  const { error } = await supabase
    .from('messages')
    .update({ body: t })
    .eq('id', messageId)
    .eq('sender_id', myId)
  if (error) {
    await dispatch(loadConversations())
    throw new Error(error.message)
  }
})

/** Найти или создать 1:1 беседу с пользователем; вернуть id и перезагрузить список. */
export const startConversation = createAsyncThunk<string | null, string>(
  'chat/start',
  async (otherUserId, { dispatch }) => {
    const { data, error } = await supabase.rpc('start_conversation', { p_other: otherUserId })
    if (error) throw new Error(error.message)
    const conversationId = data as string
    await dispatch(loadConversations())
    return conversationId
  },
)

/** Отметить беседу прочитанной (обновить свой last_read_at). */
export const markConversationRead = createAsyncThunk<string, string>(
  'chat/markRead',
  async (conversationId, { dispatch }) => {
    const myId = await currentUserId()
    if (!myId) return conversationId
    dispatch(chatActions.markRead(conversationId))
    const { error } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', myId)
    if (error) throw new Error(error.message)
    return conversationId
  },
)

/** Закрепить / отключить звук у беседы (флаги своего участника). */
export const setConversationFlag = createAsyncThunk<
  void,
  { conversationId: string; pinned?: boolean; muted?: boolean }
>('chat/setFlag', async ({ conversationId, pinned, muted }, { dispatch }) => {
  const myId = await currentUserId()
  if (!myId) throw new Error('Нет активной сессии')
  dispatch(chatActions.setConversationFlags({ conversationId, pinned, muted }))
  const patch: Record<string, boolean> = {}
  if (pinned !== undefined) patch.pinned = pinned
  if (muted !== undefined) patch.muted = muted
  const { error } = await supabase
    .from('conversation_participants')
    .update(patch)
    .eq('conversation_id', conversationId)
    .eq('user_id', myId)
  if (error) {
    await dispatch(loadConversations())
    throw new Error(error.message)
  }
})
