import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type AccountType = 'user' | 'company'

type AccountState = {
  type: AccountType
}

const initialState: AccountState = {
  type: 'user',
}

const slice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setAccountType(state, action: PayloadAction<AccountType>) {
      state.type = action.payload
    },
    toggleAccountType(state) {
      state.type = state.type === 'user' ? 'company' : 'user'
    },
  },
})

export const accountReducer = slice.reducer
export const accountActions = slice.actions
