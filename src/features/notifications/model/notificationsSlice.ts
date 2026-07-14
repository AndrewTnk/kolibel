import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AppNotification, NotificationKind } from './types'
import { loadNotifications } from './notificationsThunks'

/**
 * Карта настроек по типам: ключ отсутствует или true → уведомление включено.
 * `_since` — момент (ms epoch) ПОСЛЕДНЕГО включения типа: уведомления этого типа,
 * созданные раньше, не показываем. Нужно, потому что сервер пишет строки-уведомления
 * всегда (настройки — только клиентский фильтр); без этого после «выключить → включить»
 * сыпался бы весь бэклог, накопленный за время отключения.
 */
export type NotificationPrefs = Partial<Record<NotificationKind, boolean>> & {
  _since?: Partial<Record<NotificationKind, number>>
}

type NotificationsState = {
  items: AppNotification[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  /** Настройки по типам (из profiles.notification_prefs). */
  prefs: NotificationPrefs
  /** Текущий пуш-тост (новое уведомление, показать поверх интерфейса). */
  toast: AppNotification | null
}

const initialState: NotificationsState = {
  items: [],
  status: 'idle',
  prefs: {},
  toast: null,
}

/** Включён ли данный тип уведомлений (по умолчанию — да; `system` всегда вкл). */
export function isKindEnabled(prefs: NotificationPrefs, kind: NotificationKind): boolean {
  if (kind === 'system') return true
  return prefs[kind] !== false
}

/**
 * Показывать ли уведомление: тип включён И создано не раньше момента последнего
 * включения типа (`_since`). Отсекает бэклог, накопленный за время отключения.
 */
export function isNotifVisible(
  prefs: NotificationPrefs,
  kind: NotificationKind,
  createdAt: number,
): boolean {
  if (!isKindEnabled(prefs, kind)) return false
  const since = prefs._since?.[kind]
  return since == null || createdAt >= since
}

const slice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    /** Новое уведомление пришло по realtime — добавляем в начало (дедуп по id). */
    prepend(state, action: PayloadAction<AppNotification>) {
      if (state.items.some((n) => n.id === action.payload.id)) return
      state.items.unshift(action.payload)
    },
    markRead(state, action: PayloadAction<string>) {
      const n = state.items.find((x) => x.id === action.payload)
      if (n) n.read = true
    },
    markManyRead(state, action: PayloadAction<string[]>) {
      const ids = new Set(action.payload)
      state.items.forEach((n) => {
        if (ids.has(n.id)) n.read = true
      })
    },
    markAllRead(state) {
      state.items.forEach((n) => {
        n.read = true
      })
    },
    clear(state) {
      state.items = []
    },
    /** Обновить настройки по типам (мерж). */
    setPrefs(state, action: PayloadAction<NotificationPrefs>) {
      state.prefs = { ...state.prefs, ...action.payload }
    },
    /** Показать пуш-тост о новом уведомлении. */
    pushToast(state, action: PayloadAction<AppNotification>) {
      state.toast = action.payload
    },
    dismissToast(state) {
      state.toast = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadNotifications.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loadNotifications.fulfilled, (state, action) => {
        state.status = 'ready'
        state.items = action.payload
      })
      .addCase(loadNotifications.rejected, (state) => {
        state.status = 'error'
      })
  },
})

export const notificationsReducer = slice.reducer
export const notificationsActions = slice.actions
