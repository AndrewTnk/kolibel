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
  'id, last_message_at, conversation_participants ( user_id, last_read_at, pinned, muted, profiles ( full_name, job_title, avatar_url, account_type, job_status ) ), messages ( id, sender_id, body, created_at, reply_to, attach, reactions )'
const SELECT_BASE =
  'id, last_message_at, conversation_participants ( user_id, last_read_at, profiles ( full_name, job_title, avatar_url, account_type, job_status ) ), messages ( id, sender_id, body, created_at )'

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

/** Удалить беседу (через RPC, security definer — каскад снесёт участников и сообщения). */
export const deleteConversation = createAsyncThunk<string, string>(
  'chat/delete',
  async (conversationId, { dispatch }) => {
    dispatch(chatActions.removeConversation(conversationId))
    const { error } = await supabase.rpc('delete_conversation', {
      p_conversation_id: conversationId,
    })
    if (error) {
      await dispatch(loadConversations())
      throw new Error(error.message)
    }
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

/** Поставить/снять реакцию на сообщении. */
export const toggleReaction = createAsyncThunk<
  void,
  { conversationId: string; messageId: string; emoji: string }
>('chat/toggleReaction', async ({ conversationId, messageId, emoji }, { dispatch }) => {
  const myId = await currentUserId()
  if (!myId) throw new Error('Нет активной сессии')

  // Оптимистично переключаем в сторе.
  dispatch(chatActions.toggleReactionLocal({ conversationId, messageId, emoji }))

  // Берём актуальный массив реакций из БД (учитываем чужие), пересчитываем и пишем.
  const cur = await supabase.from('messages').select('reactions').eq('id', messageId).single()
  if (cur.error) {
    await dispatch(loadConversations()) // откат к актуальному состоянию
    throw new Error(cur.error.message)
  }
  type Raw = { em: string; users: string[] }
  let raw = ((cur.data?.reactions as Raw[] | null) ?? []).map((r) => ({
    em: r.em,
    users: [...(r.users ?? [])],
  }))
  const entry = raw.find((r) => r.em === emoji)
  if (entry) {
    entry.users = entry.users.includes(myId)
      ? entry.users.filter((u) => u !== myId)
      : [...entry.users, myId]
  } else {
    raw.push({ em: emoji, users: [myId] })
  }
  raw = raw.filter((r) => r.users.length > 0)

  const { error } = await supabase.rpc('set_message_reactions', {
    p_message_id: messageId,
    p_reactions: raw,
  })
  if (error) {
    await dispatch(loadConversations())
    throw new Error(error.message)
  }
})

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
