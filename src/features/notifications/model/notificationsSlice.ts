import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AppNotification } from './types'
import { loadNotifications } from './notificationsThunks'

type NotificationsState = {
  items: AppNotification[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  /** Текущий пуш-тост (новое уведомление, показать поверх интерфейса). */
  toast: AppNotification | null
}

const initialState: NotificationsState = {
  items: [],
  status: 'idle',
  toast: null,
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
    markAllRead(state) {
      state.items.forEach((n) => {
        n.read = true
      })
    },
    clear(state) {
      state.items = []
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
