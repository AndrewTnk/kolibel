import type { ChatAttach, ChatConversation, ChatMessage, ChatReaction } from '../model/types'

/** Встроенный профиль участника (из join к public.profiles). */
type ProfileEmbed = {
  full_name: string | null
  job_title: string | null
  avatar_url: string | null
  account_type?: 'user' | 'company' | null
  job_status?: { company?: string; companyLogo?: string } | null
} | null

export type ParticipantRow = {
  user_id: string
  last_read_at: string
  pinned?: boolean | null
  muted?: boolean | null
  profiles: ProfileEmbed
}

/** Сырое хранение реакций в БД: [{ em, users: [uid] }]. */
type ReactionRow = { em: string; users?: string[] | null }

export type MessageRow = {
  id: string
  sender_id: string
  body: string
  created_at: string
  reply_to?: ChatMessage['replyTo'] | null
  attach?: ChatAttach | null
  reactions?: ReactionRow[] | null
}

export type ConversationRow = {
  id: string
  last_message_at: string
  conversation_participants: ParticipantRow[]
  messages: MessageRow[]
}

function mapReactions(raw: ReactionRow[] | null | undefined, myId: string): ChatReaction[] | undefined {
  if (!raw || !raw.length) return undefined
  const out = raw
    .map((r) => ({
      em: r.em,
      count: (r.users ?? []).length,
      mine: (r.users ?? []).includes(myId),
    }))
    .filter((r) => r.count > 0)
  return out.length ? out : undefined
}

/** Строка сообщения из БД → модель UI. `otherLastRead` — last_read_at собеседника
 *  (для двойной галочки на наших сообщениях). */
export function rowToMessage(row: MessageRow, myId: string, otherLastRead = 0): ChatMessage {
  const createdAt = new Date(row.created_at).getTime()
  const sender: 'me' | 'them' = row.sender_id === myId ? 'me' : 'them'
  return {
    id: row.id,
    text: row.body,
    sender,
    createdAt,
    readAt: sender === 'me' && otherLastRead >= createdAt ? otherLastRead : null,
    replyTo: row.reply_to ?? null,
    attach: row.attach ?? null,
    reactions: mapReactions(row.reactions, myId),
  }
}

/** Строка беседы из БД → модель UI. Заголовок/подпись берём у собеседника. */
export function rowToConversation(row: ConversationRow, myId: string): ChatConversation {
  const other = row.conversation_participants.find((p) => p.user_id !== myId)
  const mine = row.conversation_participants.find((p) => p.user_id === myId)
  const lastRead = mine ? new Date(mine.last_read_at).getTime() : 0
  const otherLastRead = other ? new Date(other.last_read_at).getTime() : 0

  const messages = (row.messages ?? [])
    .map((m) => rowToMessage(m, myId, otherLastRead))
    .sort((a, b) => a.createdAt - b.createdAt)

  const unreadCount = messages.filter((m) => m.sender === 'them' && m.createdAt > lastRead).length

  return {
    id: row.id,
    title: other?.profiles?.full_name?.trim() || 'Пользователь',
    subtitle: other?.profiles?.job_title?.trim() || undefined,
    messages,
    updatedAt: new Date(row.last_message_at).getTime(),
    unreadCount,
    avatar: other?.profiles?.avatar_url?.trim() || undefined,
    otherId: other?.user_id,
    type: other?.profiles?.account_type === 'company' ? 'company' : 'person',
    company: other?.profiles?.job_status?.company || undefined,
    companyLogo: other?.profiles?.job_status?.companyLogo || undefined,
    pinned: !!mine?.pinned,
    muted: !!mine?.muted,
  }
}
