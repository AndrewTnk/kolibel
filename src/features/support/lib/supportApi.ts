import { supabase } from '../../../shared/lib/supabase'
import type { Discussion, DiscussionCategory, DiscussionMessage } from '../model/types'

/* Прямые запросы под RLS (0054): пользователь видит/создаёт только свои
   обращения и пишет только в свои открытые. Работает и у заблокированного
   аккаунта (RLS намеренно не фильтрует blocked — кейс «оспорить блокировку»). */

type DiscussionRow = {
  id: string
  category: DiscussionCategory
  subject: string
  status: 'open' | 'closed'
  last_sender: 'user' | 'staff'
  created_at: string
  last_message_at: string
}

type MessageRow = {
  id: string
  sender_kind: 'user' | 'staff'
  body: string
  created_at: string
}

function rowToDiscussion(r: DiscussionRow): Discussion {
  return {
    id: r.id,
    category: r.category,
    subject: r.subject,
    status: r.status,
    lastSender: r.last_sender,
    createdAt: Date.parse(r.created_at),
    lastMessageAt: Date.parse(r.last_message_at),
  }
}

function rowToMessage(r: MessageRow): DiscussionMessage {
  return { id: r.id, kind: r.sender_kind, body: r.body, createdAt: Date.parse(r.created_at) }
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Нужно войти в аккаунт')
  return id
}

/** Мои обращения, свежие сверху. Явный eq по user_id — staff по RLS видит все строки. */
export async function fetchMyDiscussions(): Promise<Discussion[]> {
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('discussions')
    .select('id, category, subject, status, last_sender, created_at, last_message_at')
    .eq('user_id', uid)
    .order('last_message_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as DiscussionRow[]).map(rowToDiscussion)
}

export async function fetchDiscussionMessages(discussionId: string): Promise<DiscussionMessage[]> {
  const { data, error } = await supabase
    .from('discussion_messages')
    .select('id, sender_kind, body, created_at')
    .eq('discussion_id', discussionId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as MessageRow[]).map(rowToMessage)
}

/** Создать обращение + первое сообщение. Возвращает id обращения. */
export async function createDiscussion(
  category: DiscussionCategory,
  subject: string,
  body: string,
): Promise<string> {
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('discussions')
    .insert({ user_id: uid, category, subject: subject.trim() })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  const id = (data as { id: string }).id
  const { error: msgError } = await supabase
    .from('discussion_messages')
    .insert({ discussion_id: id, sender_kind: 'user', body: body.trim() })
  if (msgError) throw new Error(msgError.message)
  return id
}

/** Сообщение пользователя в своё открытое обращение. */
export async function sendDiscussionMessage(discussionId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('discussion_messages')
    .insert({ discussion_id: discussionId, sender_kind: 'user', body: body.trim() })
  if (error) throw new Error(error.message)
}
