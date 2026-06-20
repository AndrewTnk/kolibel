import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import { notificationsActions } from './notificationsSlice'
import type { AppNotification, NotificationKind } from './types'

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

export type NotificationRow = {
  id: string
  kind: NotificationKind
  title: string | null
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

export function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title ?? '',
    text: row.body ?? '',
    link: row.link ?? undefined,
    read: row.read,
    createdAt: new Date(row.created_at).getTime(),
  }
}

const SELECT = 'id, kind, title, body, link, read, created_at'

/** Загрузка уведомлений текущего пользователя. */
export const loadNotifications = createAsyncThunk<AppNotification[], void>(
  'notifications/load',
  async () => {
    const me = await currentUserId()
    if (!me) return []
    const { data, error } = await supabase
      .from('notifications')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return (data as NotificationRow[]).map(rowToNotification)
  },
)

/** Пометить одно уведомление прочитанным (оптимистично). */
export const markNotificationRead = createAsyncThunk<string, string>(
  'notifications/markRead',
  async (id, { dispatch }) => {
    dispatch(notificationsActions.markRead(id))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) throw new Error(error.message)
    return id
  },
)

/** Пометить все прочитанными (оптимистично). */
export const markAllNotificationsRead = createAsyncThunk<void, void>(
  'notifications/markAllRead',
  async (_, { dispatch }) => {
    const me = await currentUserId()
    if (!me) return
    dispatch(notificationsActions.markAllRead())
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', me)
      .eq('read', false)
    if (error) throw new Error(error.message)
  },
)
