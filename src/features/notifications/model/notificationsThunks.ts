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
  actor_id: string | null
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
    actorId: row.actor_id ?? undefined,
  }
}

const SELECT = 'id, kind, title, body, link, read, created_at, actor_id'

/**
 * Дотягивает аватар, тип и АКТУАЛЬНОЕ имя актора (из profiles/companies) по actorId.
 * Текст уведомления «запекается» триггером при вставке (title = имя на тот момент),
 * поэтому после переименования компании/пользователя старые уведомления показывали бы
 * устаревшее имя. Здесь перетираем `title` живым именем — фикс и для старых, и для новых.
 * Мутирует переданные объекты и возвращает их же.
 */
export async function enrichNotificationAvatars(items: AppNotification[]): Promise<AppNotification[]> {
  const ids = [...new Set(items.map((n) => n.actorId).filter((x): x is string => !!x))]
  if (!ids.length) return items
  const [profs, comps] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, account_type').in('id', ids),
    supabase.from('companies').select('id, name, avatar_url, logo_url').in('id', ids),
  ])
  const map = new Map<string, { name?: string; avatar?: string; actorKind: 'person' | 'company' }>()
  for (const p of (profs.data ?? []) as { id: string; full_name: string | null; avatar_url: string | null; account_type: string | null }[]) {
    map.set(p.id, {
      name: p.full_name?.trim() || undefined,
      avatar: p.avatar_url ?? undefined,
      actorKind: p.account_type === 'company' ? 'company' : 'person',
    })
  }
  for (const c of (comps.data ?? []) as { id: string; name: string | null; avatar_url: string | null; logo_url: string | null }[]) {
    const cur = map.get(c.id)
    // У аккаунта-компании имя живёт в companies.name (profiles.full_name пуст).
    map.set(c.id, {
      name: c.name?.trim() || cur?.name,
      avatar: c.logo_url ?? c.avatar_url ?? cur?.avatar,
      actorKind: 'company',
    })
  }
  for (const n of items) {
    const a = n.actorId ? map.get(n.actorId) : undefined
    if (a) {
      n.avatar = a.avatar
      n.actorKind = a.actorKind
      if (a.name) n.title = a.name // живое имя перетирает «запечённое» при вставке
    }
  }
  return items
}

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
    const items = (data as NotificationRow[]).map(rowToNotification)
    return enrichNotificationAvatars(items)
  },
)

/** Удалить все уведомления текущего пользователя (оптимистично). */
export const clearAllNotifications = createAsyncThunk<void, void>(
  'notifications/clearAll',
  async (_, { dispatch }) => {
    const me = await currentUserId()
    if (!me) return
    dispatch(notificationsActions.clear())
    const { error } = await supabase.from('notifications').delete().eq('user_id', me)
    if (error) throw new Error(error.message)
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
