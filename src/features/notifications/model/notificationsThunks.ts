import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import { notificationsActions, isKindEnabled, type NotificationPrefs } from './notificationsSlice'
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
  entity_id: string | null
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
    entityId: row.entity_id ?? undefined,
  }
}

const SELECT = 'id, kind, title, body, link, read, created_at, actor_id, entity_id'

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

/** Прочитать настройки уведомлений (jsonb на profiles). Устойчиво к 0033. */
async function fetchPrefs(me: string): Promise<NotificationPrefs> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_prefs')
    .eq('id', me)
    .maybeSingle()
  if (error || !data) return {}
  return ((data as { notification_prefs: NotificationPrefs | null }).notification_prefs ?? {}) as NotificationPrefs
}

/**
 * Загрузка уведомлений текущего пользователя. Заодно подтягивает настройки по
 * типам и отфильтровывает отключённые (они не попадают в список/бейдж).
 */
export const loadNotifications = createAsyncThunk<AppNotification[], void>(
  'notifications/load',
  async (_, { dispatch }) => {
    const me = await currentUserId()
    if (!me) return []
    const prefs = await fetchPrefs(me)
    dispatch(notificationsActions.setPrefs(prefs))
    const { data, error } = await supabase
      .from('notifications')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    const items = (data as NotificationRow[])
      .map(rowToNotification)
      .filter((n) => isKindEnabled(prefs, n.kind))
    return enrichNotificationAvatars(items)
  },
)

/**
 * Обновить настройки уведомлений (по группе типов) — оптимистично + запись в
 * profiles.notification_prefs, затем перезагрузка списка для пере-фильтрации.
 */
export const updateNotificationPrefs = createAsyncThunk<void, NotificationPrefs>(
  'notifications/updatePrefs',
  async (patch, { dispatch, getState }) => {
    const me = await currentUserId()
    if (!me) throw new Error('Нет активной сессии')
    const prev = (getState() as { notifications: { prefs: NotificationPrefs } }).notifications.prefs
    const nextPrefs = { ...prev, ...patch }
    dispatch(notificationsActions.setPrefs(patch)) // оптимистично
    const { error } = await supabase
      .from('profiles')
      .update({ notification_prefs: nextPrefs })
      .eq('id', me)
    if (error) {
      dispatch(notificationsActions.setPrefs(prev)) // откат
      throw new Error(error.message)
    }
    void dispatch(loadNotifications()) // пере-фильтровать уже загруженные
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

/** Пометить набор уведомлений прочитанными (напр. при разворачивании группы). */
export const markNotificationsRead = createAsyncThunk<string[], string[]>(
  'notifications/markManyRead',
  async (ids, { dispatch }) => {
    if (!ids.length) return ids
    dispatch(notificationsActions.markManyRead(ids))
    const { error } = await supabase.from('notifications').update({ read: true }).in('id', ids)
    if (error) throw new Error(error.message)
    return ids
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
