import { createSlice } from '@reduxjs/toolkit'
import type { AuthSession } from './types'
import { bootstrapAuth, signIn, signOut, signUp } from './authThunks.ts'

/** Статус модерации текущего аккаунта (для экрана блокировки при входе). */
export type AccountModeration = {
  blocked: boolean
  reason: string
  message: string
}

type AuthState = {
  bootstrapped: boolean
  session: AuthSession | null
  user: AuthSession['user'] | null
  status: 'idle' | 'loading'
  error: string | null
  /** Заполняется loadProfile: если аккаунт заблокирован — показываем экран блокировки. */
  moderation: AccountModeration | null
}

const initialState: AuthState = {
  bootstrapped: false,
  session: null,
  user: null,
  status: 'idle',
  error: null,
  moderation: null,
}

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: { payload: AuthSession | null }) {
      state.session = action.payload
      state.user = action.payload?.user ?? null
    },
    setBootstrapped(state, action: { payload: boolean }) {
      state.bootstrapped = action.payload
    },
    setModeration(state, action: { payload: AccountModeration | null }) {
      state.moderation = action.payload
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (b) => {
    b.addCase(bootstrapAuth.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
    b.addCase(bootstrapAuth.fulfilled, (s, a) => {
      s.status = 'idle'
      s.bootstrapped = true
      s.session = a.payload
      s.user = a.payload?.user ?? null
    })
    b.addCase(bootstrapAuth.rejected, (s, a) => {
      s.status = 'idle'
      s.bootstrapped = true
      s.error = a.error.message ?? 'Ошибка инициализации авторизации'
    })

    b.addCase(signIn.pending, (s) => {
      s.status = 'loading'
      s.error = null
      s.moderation = null
    })
    b.addCase(signIn.fulfilled, (s, a) => {
      s.status = 'idle'
      s.session = a.payload
      s.user = a.payload?.user ?? null
    })
    b.addCase(signIn.rejected, (s, a) => {
      s.status = 'idle'
      s.error = a.error.message ?? 'Ошибка входа'
    })

    b.addCase(signUp.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
    b.addCase(signUp.fulfilled, (s, a) => {
      s.status = 'idle'
      s.session = a.payload
      s.user = a.payload?.user ?? null
    })
    b.addCase(signUp.rejected, (s, a) => {
      s.status = 'idle'
      s.error = a.error.message ?? 'Ошибка регистрации'
    })

    b.addCase(signOut.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
    b.addCase(signOut.fulfilled, (s) => {
      s.status = 'idle'
      s.session = null
      s.user = null
      s.moderation = null
    })
    b.addCase(signOut.rejected, (s, a) => {
      s.status = 'idle'
      s.error = a.error.message ?? 'Ошибка выхода'
    })
  },
})

export const authReducer = slice.reducer
export const authActions = slice.actions
