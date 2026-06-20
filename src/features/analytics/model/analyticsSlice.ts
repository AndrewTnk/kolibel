import { createSlice } from '@reduxjs/toolkit'
import type { Analytics } from './types'
import { loadAnalytics } from './analyticsThunks'

type AnalyticsStatus = 'idle' | 'loading' | 'ready' | 'error'

type AnalyticsState = {
  data: Analytics | null
  status: AnalyticsStatus
  /** Чья аналитика сейчас в `data` (id аккаунта) — чтобы перезагружать при смене аккаунта. */
  userId: string | null
}

const initialState: AnalyticsState = {
  data: null,
  status: 'idle',
  userId: null,
}

const slice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(loadAnalytics.pending, (s, a) => {
      s.status = 'loading'
      s.userId = a.meta.arg
    })
    b.addCase(loadAnalytics.fulfilled, (s, a) => {
      s.data = a.payload
      s.status = 'ready'
      s.userId = a.meta.arg
    })
    b.addCase(loadAnalytics.rejected, (s, a) => {
      s.status = 'error'
      s.userId = a.meta.arg
    })
  },
})

export const analyticsReducer = slice.reducer
