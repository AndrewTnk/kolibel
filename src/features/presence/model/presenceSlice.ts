import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/**
 * Глобальное присутствие.
 * - `onlineIds` — id аккаунтов, которые сейчас онлайн (считается по свежести last_seen_at).
 * - `watched`   — id → счётчик значков `OnlineDot`, показанных на экране (ref-count).
 *   `PresenceTracker` опрашивает статус именно этих id (тех, что реально видны), поэтому
 *   «в сети» работает везде: чат, любой профиль, рекомендации — где отрисован OnlineDot.
 */
type PresenceState = {
  onlineIds: string[]
  watched: Record<string, number>
}

const initialState: PresenceState = {
  onlineIds: [],
  watched: {},
}

const slice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    /** Заменить набор онлайн-id (считает PresenceTracker по last_seen_at). */
    setOnlineIds(state, action: PayloadAction<string[]>) {
      state.onlineIds = action.payload
    },
    /** Начать наблюдать за статусом id (значок появился на экране). */
    watch(state, action: PayloadAction<string>) {
      const id = action.payload
      state.watched[id] = (state.watched[id] ?? 0) + 1
    },
    /** Перестать наблюдать (значок ушёл с экрана). */
    unwatch(state, action: PayloadAction<string>) {
      const id = action.payload
      const n = (state.watched[id] ?? 0) - 1
      if (n <= 0) delete state.watched[id]
      else state.watched[id] = n
    },
  },
})

export const presenceReducer = slice.reducer
export const presenceActions = slice.actions
