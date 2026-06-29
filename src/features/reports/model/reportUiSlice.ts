import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ReportTarget } from './types'

type ReportUiState = {
  /** Открытая модалка жалобы на эту цель (null — закрыта). */
  target: ReportTarget | null
}

const initialState: ReportUiState = { target: null }

const slice = createSlice({
  name: 'reportUi',
  initialState,
  reducers: {
    openReport(state, action: PayloadAction<ReportTarget>) {
      state.target = action.payload
    },
    closeReport(state) {
      state.target = null
    },
  },
})

export const reportUiReducer = slice.reducer
export const reportUiActions = slice.actions
