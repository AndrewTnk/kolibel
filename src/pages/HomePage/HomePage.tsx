import { AppHeader } from '../../shared/ui/AppHeader/AppHeader.tsx'
import { useAppSelector } from '../../app/store/hooks'
import { useIsMobile } from '../../shared/lib/useMediaQuery'
import { PostComposer } from '../../features/feed/ui/PostComposer'
import { FeedList } from '../../features/feed/ui/FeedList'
import { ConnectionsGraph } from '../../features/network/ui/ConnectionsGraph'
import { SupportLinks } from '../../shared/ui/Recommendations/SupportLinks'
import { RecommendedPeople } from '../../shared/ui/Recommendations/RecommendedPeople'
import { RecommendedCompanies } from '../../shared/ui/Recommendations/RecommendedCompanies'
import { TodayRow } from '../../widgets/TodayRow/TodayRow'
import { ProfilePulse } from '../../widgets/ProfilePulse/ProfilePulse'
import { CompanyTodayRow } from '../../widgets/CompanyTodayRow/CompanyTodayRow'
import { CompanyPulse } from '../../widgets/CompanyPulse/CompanyPulse'
import { RecommendedCandidates } from '../../widgets/RecommendedCandidates/RecommendedCandidates'
import styles from './HomePage.module.css'

export function HomePage() {
  const isCompany = useAppSelector((s) => s.account.type === 'company')
  const isMobile = useIsMobile()

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.inner}>
          {isCompany ? <CompanyTodayRow /> : <TodayRow />}
          <div className={styles.layout}>
            <aside className={styles.sidebarLeft} aria-label="Боковая панель">
              {isCompany ? (
                <ConnectionsGraph withStats title="Сеть компании" />
              ) : (
                <ConnectionsGraph withStats />
              )}
              <SupportLinks />
            </aside>

            <div className={styles.center}>
              {/* На мобилке инлайн-композер убран — пост создаётся из иконки в шапке (модалка). */}
              {!isMobile ? <PostComposer /> : null}
              {/* У компании в ленту вставляем только рекомендованных кандидатов (не юзер-рекомендации). */}
              <FeedList
                intersperse
                ranked
                recSlots={isCompany ? [<RecommendedCandidates key="cand" horizontal />] : undefined}
              />
            </div>

            <aside className={styles.sidebarRight} aria-label="Рекомендации">
              {isCompany ? (
                <>
                  <CompanyPulse />
                  <RecommendedCandidates />
                </>
              ) : (
                <>
                  <ProfilePulse />
                  <RecommendedPeople />
                  <RecommendedCompanies />
                </>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
