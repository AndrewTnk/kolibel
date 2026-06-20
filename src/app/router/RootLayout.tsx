import { Outlet } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { ChatOverlay } from '../../features/chat/ui/ChatOverlay'
import { VacancyModal } from '../../features/vacancies/ui/VacancyModal'
import { VacancyModals } from '../../features/vacancies/ui/VacancyModals'
import { ContactToast } from '../../features/vacancies/ui/ContactToast'
import { PullToRefresh } from '../../shared/ui/PullToRefresh/PullToRefresh'
import { ProfileAnalyticsModal } from '../../widgets/ProfileAnalyticsModal/ProfileAnalyticsModal'
import { CompanyAnalyticsModal } from '../../features/company/ui/CompanyAnalyticsModal/CompanyAnalyticsModal'
import { profileActions } from '../../features/profile/model/profileSlice'
import { companyActions } from '../../features/company/model/companySlice'

/**
 * Корневой layout: страницы (Outlet) + глобальные оверлеи внутри контекста роутера,
 * чтобы их `<Link>`/навигация работали (мини-чат рендерит ссылки на профиль).
 */
export function RootLayout() {
  const dispatch = useAppDispatch()
  const analyticsOpen = useAppSelector((s) => s.profile.analyticsOpen)
  const companyAnalyticsOpen = useAppSelector((s) => s.company.analyticsOpen)
  return (
    <>
      <Outlet />
      <PullToRefresh />
      <ChatOverlay />
      <VacancyModal />
      <VacancyModals />
      <ContactToast />
      {analyticsOpen ? (
        <ProfileAnalyticsModal onClose={() => dispatch(profileActions.closeAnalytics())} />
      ) : null}
      {companyAnalyticsOpen ? (
        <CompanyAnalyticsModal onClose={() => dispatch(companyActions.closeAnalytics())} />
      ) : null}
    </>
  )
}
