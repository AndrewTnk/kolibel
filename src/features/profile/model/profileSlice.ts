import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Resume } from './types'
import { completeOnboarding, loadProfile, saveProfile } from './profileThunks'

/** Пустое резюме — стартовое состояние до загрузки профиля из БД (никаких моков). */
const emptyResume: Resume = {
  fullName: '',
  jobTitle: '',
  headline: '',
  location: '',
  country: undefined,
  workFormat: '',
  available: true,
  isOnline: true,
  jobStatus: { kind: 'seeking' },
  avatarInitials: '',
  avatar: undefined,
  banner: undefined,
  about: '',
  highlights: [],
  skills: [],
  experience: [],
  education: [],
  languages: [],
  contacts: [],
}

type ProfileState = {
  resume: Resume
  loaded: boolean
  onboarded: boolean
  status: 'idle' | 'loading' | 'saving'
  error: string | null
  /** Открыта ли глобальная модалка аналитики профиля (триггерится из хедера на мобилке). */
  analyticsOpen: boolean
}

const initialState: ProfileState = {
  resume: emptyResume,
  loaded: false,
  onboarded: true,
  status: 'idle',
  error: null,
  analyticsOpen: false,
}

const slice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    /** Частичное обновление резюме (любые поля верхнего уровня) */
    updateResume(state, action: PayloadAction<Partial<Resume>>) {
      state.resume = { ...state.resume, ...action.payload }
    },
    setOnboarded(state, action: PayloadAction<boolean>) {
      state.onboarded = action.payload
    },
    openAnalytics(state) {
      state.analyticsOpen = true
    },
    closeAnalytics(state) {
      state.analyticsOpen = false
    },
  },
  extraReducers: (b) => {
    b.addCase(loadProfile.pending, (s) => {
      s.status = 'loading'
      s.error = null
      // Грузим профиль (нового) аккаунта — текущие данные больше не валидны.
      // Вызывается только при auth-переходах (вход/INITIAL_SESSION/switchAccount).
      s.loaded = false
    })
    b.addCase(loadProfile.fulfilled, (s, a) => {
      s.status = 'idle'
      s.loaded = true
      if (a.payload) s.resume = a.payload
    })
    b.addCase(loadProfile.rejected, (s, a) => {
      s.status = 'idle'
      s.loaded = true
      s.error = a.error.message ?? 'Не удалось загрузить профиль'
    })

    b.addCase(saveProfile.pending, (s) => {
      s.status = 'saving'
      s.error = null
    })
    b.addCase(saveProfile.fulfilled, (s, a) => {
      s.status = 'idle'
      s.resume = a.payload
    })
    b.addCase(saveProfile.rejected, (s, a) => {
      s.status = 'idle'
      s.error = a.error.message ?? 'Не удалось сохранить профиль'
    })

    b.addCase(completeOnboarding.fulfilled, (s) => {
      s.onboarded = true
    })
  },
})

export const profileReducer = slice.reducer
export const profileActions = slice.actions
