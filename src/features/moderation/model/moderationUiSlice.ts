import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type ModerationUiState = {
  /** id ответа модерации для модалки (null — закрыта). */
  responseId: string | null
}

const initialState: ModerationUiState = { responseId: null }

const slice = createSlice({
  name: 'moderationUi',
  initialState,
  reducers: {
    openModerationResponse(state, action: PayloadAction<string>) {
      state.responseId = action.payload
    },
    closeModerationResponse(state) {
      state.responseId = null
    },
  },
})

export const moderationUiReducer = slice.reducer
export const moderationUiActions = slice.actions
