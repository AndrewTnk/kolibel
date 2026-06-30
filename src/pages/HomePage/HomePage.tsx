import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppHeader } from '../../shared/ui/AppHeader/AppHeader.tsx'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { feedActions } from '../../features/feed/model/feedSlice'
import { useIsMobile } from '../../shared/lib/useMediaQuery'
import { PostComposer } from '../../features/feed/ui/PostComposer'
import { FeedList } from '../../features/feed/ui/FeedList'
import { FeedSortSelect } from '../../features/feed/ui/FeedSortSelect'
import type { FeedSortMode } from '../../features/feed/lib/feedSort'
import { ArticlesDiscovery } from '../../features/articles/ui/ArticlesDiscovery'
import { SupportLinks } from '../../shared/ui/Recommendations/SupportLinks'
import { RecommendedPeople } from '../../shared/ui/Recommendations/RecommendedPeople'
import { RecommendedVacancies } from '../../shared/ui/Recommendations/RecommendedVacancies'
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
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const [sortMode, setSortMode] = useState<FeedSortMode>('recommended')
  // Якорь к посту из уведомления (/?post=:id) — прокрутка + подсветка в ленте.
  const focusPostId = searchParams.get('post') ?? undefined

  // Deep-link `/?post=:id` (из админки/уведомлений) — открываем модалку поста (веб).
  useEffect(() => {
    if (focusPostId && !isMobile) dispatch(feedActions.openPost(focusPostId))
  }, [focusPostId, isMobile, dispatch])

  // Карусели, чередуемые в ленте на мобилке (статьи — в общей ротации, как остальные рекомендации).
  const recSlots = isCompany
    ? [
        <RecommendedCandidates key="cand" horizontal cards />,
        <RecommendedPeople key="people" horizontal cards />,
        <ArticlesDiscovery key="articles" variant="carousel" />,
      ]
    : [
        <RecommendedPeople key="people" horizontal cards />,
        <RecommendedVacancies key="vac" horizontal />,
        <RecommendedCompanies key="comp" horizontal cards />,
        <ArticlesDiscovery key="articles" variant="carousel" />,
      ]

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.inner}>
          {isCompany ? <CompanyTodayRow /> : <TodayRow />}
          <div className={styles.layout}>
            <aside className={styles.sidebarLeft} aria-label="Боковая панель">
              <ArticlesDiscovery />
              <SupportLinks />
            </aside>

            <div className={styles.center}>
              {/* На мобилке инлайн-композер убран — пост создаётся из иконки в шапке (модалка). */}
              {!isMobile ? <PostComposer /> : null}
              {/* Быстрая сортировка ленты (над постами). */}
              <FeedSortSelect value={sortMode} onChange={setSortMode} />
              {/* Статьи чередуются в ленте на мобилке вместе с остальными рекомендациями (recSlots). */}
              <FeedList
                intersperse
                ranked
                sortMode={sortMode}
                focusPostId={focusPostId}
                recSlots={recSlots}
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
