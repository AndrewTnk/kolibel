import { createSlice } from '@reduxjs/toolkit'
import { loadAdminRole } from './adminThunks'
import type { AdminRole } from './types'

type AdminState = {
  /** Роль текущего пользователя в админ-панели (null — обычный пользователь). */
  role: AdminRole | null
  loaded: boolean
}

const initialState: AdminState = {
  role: null,
  loaded: false,
}

const slice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(loadAdminRole.fulfilled, (s, a) => {
      s.role = a.payload
      s.loaded = true
    })
    b.addCase(loadAdminRole.rejected, (s) => {
      s.role = null
      s.loaded = true
    })
  },
})

export const adminReducer = slice.reducer
export const adminActions = slice.actions
