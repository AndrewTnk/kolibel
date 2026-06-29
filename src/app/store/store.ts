import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { resetStores } from './resetStores'
import { authReducer } from '../../features/auth/model/authSlice'
import { chatReducer } from '../../features/chat/model/chatSlice'
import { chatUiReducer } from '../../features/chat/model/chatUiSlice'
import { feedReducer } from '../../features/feed/model/feedSlice'
import { vacanciesReducer } from '../../features/vacancies/model/vacanciesSlice'
import { vacanciesListReducer } from '../../features/vacancies/model/vacanciesListSlice'
import { profileReducer } from '../../features/profile/model/profileSlice'
import { companyReducer } from '../../features/company/model/companySlice'
import { accountReducer } from '../../features/account/model/accountSlice'
import { networkReducer } from '../../features/network/model/networkSlice'
import { notificationsReducer } from '../../features/notifications/model/notificationsSlice'
import { analyticsReducer } from '../../features/analytics/model/analyticsSlice'
import { presenceReducer } from '../../features/presence/model/presenceSlice'
import { blocksReducer } from '../../features/blocks/model/blocksSlice'
import { adminReducer } from '../../features/admin/model/adminSlice'
import { reportUiReducer } from '../../features/reports/model/reportUiSlice'
import { moderationUiReducer } from '../../features/moderation/model/moderationUiSlice'
import { articlesReducer } from '../../features/articles/model/articlesSlice'

const combinedReducer = combineReducers({
  auth: authReducer,
  feed: feedReducer,
  chat: chatReducer,
  chatUi: chatUiReducer,
  vacancies: vacanciesReducer,
  vacanciesList: vacanciesListReducer,
  profile: profileReducer,
  company: companyReducer,
  account: accountReducer,
  network: networkReducer,
  notifications: notificationsReducer,
  analytics: analyticsReducer,
  presence: presenceReducer,
  blocks: blocksReducer,
  admin: adminReducer,
  reportUi: reportUiReducer,
  moderationUi: moderationUiReducer,
  articles: articlesReducer,
})

export type RootState = ReturnType<typeof combinedReducer>

/**
 * Корневой редьюсер с поддержкой resetStores: при сбросе оставляем только `auth`,
 * остальные слайсы переинициализируются (combineReducers подставит их initialState).
 */
const rootReducer = (
  state: RootState | undefined,
  action: Parameters<typeof combinedReducer>[1],
): RootState => {
  if (action.type === resetStores.type && state) {
    // Сохраняем auth и presence (присутствие — глобальное, не зависит от аккаунта).
    return combinedReducer({ auth: state.auth, presence: state.presence } as RootState, action)
  }
  return combinedReducer(state, action)
}

export const store = configureStore({
  reducer: rootReducer,
})

export type AppDispatch = typeof store.dispatch

