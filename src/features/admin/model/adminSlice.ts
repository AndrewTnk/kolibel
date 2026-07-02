import { createSlice } from '@reduxjs/toolkit'
import { loadAdminRole } from './adminThunks'
import type { AdminRole } from './types'

type AdminState = {
  /** Роль текущего пользователя в админ-панели (null — обычный пользователь). */
  role: AdminRole | null
  /** Издатель обновлений платформы (publisher_roles) — категория «Update» в статьях. */
  publisher: boolean
  loaded: boolean
}

const initialState: AdminState = {
  role: null,
  publisher: false,
  loaded: false,
}

const slice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(loadAdminRole.fulfilled, (s, a) => {
      s.role = a.payload.role
      s.publisher = a.payload.publisher
      s.loaded = true
    })
    b.addCase(loadAdminRole.rejected, (s) => {
      s.role = null
      s.publisher = false
      s.loaded = true
    })
  },
})

export const adminReducer = slice.reducer
export const adminActions = slice.actions
