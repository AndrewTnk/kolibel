import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import { notificationsActions, isKindEnabled, isNotifVisible, type NotificationPrefs } from './notificationsSlice'
import type { AppNotification, NotificationKind } from './types'
import { selectViewedConversationId } from '../../chat/model/chatUiSlice'
import type { RootState } from '../../../app/store/store'

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
      .filter((n) => isNotifVisible(prefs, n.kind, n.createdAt))
    return enrichNotificationAvatars(items)
  },
)

/**
 * Лёгкий опрос новых уведомлений — замена realtime-подписки (WebSocket не проходит
 * через Vercel-прокси из РФ, см. CONTEXT_HANDOFF → «Доступ из России»).
 *
 * Берёт только уведомления, созданные ПОЗЖЕ последнего известного (`items[0]`), и для
 * каждого нового: фильтрует по настройкам, дотягивает аватар, добавляет в список и
 * показывает пуш-тост (кроме сообщения из открытой прямо сейчас беседы). Обычно 0 строк.
 */
export const pollNewNotifications = createAsyncThunk<void, void>(
  'notifications/poll',
  async (_, { dispatch, getState }) => {
    const me = await currentUserId()
    if (!me) return
    const state = getState() as RootState
    if (state.notifications.status !== 'ready') return
    const items = state.notifications.items
    const since = items.length ? items[0].createdAt : 0
    const sinceIso = new Date(since || 0).toISOString()

    const { data, error } = await supabase
      .from('notifications')
      .select(SELECT)
      .gt('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error || !data) return

    // ascending → при prepend самое новое добавляется последним и оказывается сверху.
    const rows = (data as NotificationRow[]).reverse()
    const prefs = state.notifications.prefs
    const known = new Set(items.map((n) => n.id))
    const toAdd = rows
      .map(rowToNotification)
      .filter((n) => isNotifVisible(prefs, n.kind, n.createdAt) && !known.has(n.id))
    if (!toAdd.length) return

    await enrichNotificationAvatars(toAdd)
    const viewedId = selectViewedConversationId(state)
    const viewedConv = viewedId ? state.chat.conversations.find((c) => c.id === viewedId) : null
    for (const notif of toAdd) {
      dispatch(notificationsActions.prepend(notif))
      // Сообщение из открытой сейчас беседы — пользователь его уже видит, тост не нужен.
      const inOpenChat =
        notif.kind === 'message' && !!viewedConv?.otherId && notif.actorId === viewedConv.otherId
      if (inOpenChat) void dispatch(markNotificationRead(notif.id))
      else dispatch(notificationsActions.pushToast(notif))
    }
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
    // Для типов, ВКЛючаемых этим патчем (были off → true), фиксируем момент включения:
    // накопленный за время отключения бэклог этого типа показывать не будем.
    const now = Date.now()
    const since: Partial<Record<NotificationKind, number>> = { ...(prev._since ?? {}) }
    for (const [kind, val] of Object.entries(patch) as [NotificationKind, boolean][]) {
      if (val === true && !isKindEnabled(prev, kind)) since[kind] = now
    }
    const patchWithSince: NotificationPrefs = { ...patch, _since: since }
    const nextPrefs = { ...prev, ...patchWithSince }
    dispatch(notificationsActions.setPrefs(patchWithSince)) // оптимистично
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
