import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { DiscussionCategory } from './types'

/**
 * Глобальное состояние модалки «Поддержка» (обращения): открывается из
 * SupportLinks («Тех. поддержка»), из уведомления kind 'support' (сразу на
 * обращение) и с экрана блокировки («Оспорить блокировку», preset 'appeal').
 */
type SupportUiState = {
  open: boolean
  /** Открыть сразу конкретное обращение (из уведомления). */
  activeId: string | null
  /** Предвыбранная категория новой формы (экран блокировки → 'appeal'). */
  preset: DiscussionCategory | null
}

const initialState: SupportUiState = { open: false, activeId: null, preset: null }

const supportUiSlice = createSlice({
  name: 'supportUi',
  initialState,
  reducers: {
    openSupport(state, action: PayloadAction<{ discussionId?: string; preset?: DiscussionCategory } | undefined>) {
      state.open = true
      state.activeId = action.payload?.discussionId ?? null
      state.preset = action.payload?.preset ?? null
    },
    closeSupport(state) {
      state.open = false
      state.activeId = null
      state.preset = null
    },
  },
})

export const supportUiActions = supportUiSlice.actions
export const supportUiReducer = supportUiSlice.reducer
