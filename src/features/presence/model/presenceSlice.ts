import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/** Глобальное присутствие: id аккаунтов, которые сейчас онлайн (приложение открыто). */
type PresenceState = {
  onlineIds: string[]
}

const initialState: PresenceState = {
  onlineIds: [],
}

const slice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    /** Заменить набор онлайн-id (по событиям Supabase Presence sync/join/leave). */
    setOnlineIds(state, action: PayloadAction<string[]>) {
      state.onlineIds = action.payload
    },
  },
})

export const presenceReducer = slice.reducer
export const presenceActions = slice.actions
