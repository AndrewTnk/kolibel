import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { incrementVacancyView, loadVacancies } from '../../features/vacancies/model/vacancyThunks'
import { vacanciesActions } from '../../features/vacancies/model/vacanciesSlice'
import { formatSalary } from '../../features/vacancies/lib/labels'
import { loadNetwork, toggleFollow } from '../../features/network/model/networkThunks'
import { useProfilePulse, formatDelta } from '../../features/profile/lib/useProfilePulse'
import { useIsMobile } from '../../shared/lib/useMediaQuery'
import { ProfileAnalyticsModal } from '../ProfileAnalyticsModal/ProfileAnalyticsModal'
import { BlockSkeleton } from '../../shared/ui/Skeleton/Skeleton'
import { CompanyBadge } from '../../shared/ui/CompanyBadge/CompanyBadge'
import styles from './TodayRow.module.css'

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

/** Полоса «Сегодня для тебя» — три карточки-возможности (только user-режим). */
export function TodayRow() {
  const dispatch = useAppDispatch()
  const nav = useNavigate()

  const vacancies = useAppSelector((s) => s.vacanciesList.items)
  const vacanciesLoaded = useAppSelector((s) => s.vacanciesList.loaded)
  const people = useAppSelector((s) => s.network.recommendedPeople)
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const networkStatus = useAppSelector((s) => s.network.status)
  const pulse = useProfilePulse()
  const isMobile = useIsMobile()
  // Сид выбора случайной карточки — раз на монтаж (новый на каждый заход/обновление страницы).
  const [pickSeed] = useState(() => Math.random())

  const [analyticsOpen, setAnalyticsOpen] = useState(false)

  useEffect(() => {
    if (!vacancies.length && !vacanciesLoaded) void dispatch(loadVacancies())
  }, [vacancies.length, vacanciesLoaded, dispatch])
  useEffect(() => {
    if (networkStatus === 'idle') void dispatch(loadNetwork())
  }, [networkStatus, dispatch])

  // Топ-вакансия (нет match-скора на бэке → берём первую из списка).
  const vacancy = vacancies[0]
  // Человек со связями (первый рекомендованный).
  const person = people[0]
  const isFollowing = person ? followingIds.includes(person.id) : false

  const c = pulse.breakdown[0]?.value ?? 0
  const h = pulse.breakdown[1]?.value ?? 0

  // Скелетоны на время холодной загрузки (вакансии/сеть ещё не подгрузились).
  const loading =
    (!vacanciesLoaded && !vacancy) ||
    networkStatus === 'idle' ||
    networkStatus === 'loading'

  // На мобилке показываем ОДНУ случайную карточку из доступных (вакансия/человек/аналитика).
  const availableCards = [
    vacancy ? ('vacancy' as const) : null,
    person ? ('person' as const) : null,
    'analytics' as const,
  ].filter(Boolean) as ('vacancy' | 'person' | 'analytics')[]
  const chosenCard = availableCards.length
    ? availableCards[Math.floor(pickSeed * availableCards.length)]
    : 'analytics'
  const showCard = (k: 'vacancy' | 'person' | 'analytics') => !isMobile || chosenCard === k

  return (
      <>
        <div className={styles.head}>
          <div className={styles.title}>Сегодня для тебя</div>
          <div className={styles.meta}>подобрано на основе твоего профиля</div>
        </div>
        <section className={styles.today}>
          {loading ? (
            isMobile ? (
              <BlockSkeleton height={180} radius={16} />
            ) : (
              <>
                <BlockSkeleton height={180} radius={16} />
                <BlockSkeleton height={180} radius={16} />
                <BlockSkeleton height={180} radius={16} />
              </>
            )
          ) : null}
          {!loading && vacancy && showCard('vacancy') ? (
            <article className={[styles.card, styles.match].join(' ')}>
              <div className={styles.kind}>
                Совпадение по вакансии <span className={styles.badge}>новое</span>
              </div>
              <div className={styles.body}>
                <div className={styles.name}>{vacancy.title}</div>
                <div className={styles.metaLine}>
                  {[vacancy.company, vacancy.city, formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.currency)]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                {vacancy.skills?.length ? (
                  <div className={styles.why}>Ключевые навыки: {vacancy.skills.slice(0, 4).join(', ')}</div>
                ) : (
                  <div className={styles.why}>Подходит по твоему профилю.</div>
                )}
              </div>
              <div className={styles.foot}>
                <div className={styles.fitPill} title="Подходит тебе" aria-label="Подходит тебе">
                  <span>✓</span>
                </div>
                <button
                  type="button"
                  className={styles.cta}
                  onClick={() => {
                    dispatch(vacanciesActions.openVacancy(vacancy.id))
                    void dispatch(incrementVacancyView(vacancy.id))
                  }}
                >
                  Откликнуться <ArrowIcon />
                </button>
              </div>
            </article>
          ) : null}

          {!loading && person && showCard('person') ? (
            <article
              className={[styles.card, styles.person].join(' ')}
              role="button"
              tabIndex={0}
              onClick={() => nav(`/u/${person.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') nav(`/u/${person.id}`)
              }}
            >
              <div className={styles.kind}>Стоит познакомиться</div>
              <div className={styles.body}>
                <div className={styles.name}>
                  {person.fullName}
                  <CompanyBadge logo={person.companyLogo} title={person.company} size={14} />
                </div>
                <div className={styles.metaLine}>
                  {[person.jobTitle, person.company].filter(Boolean).join(' · ') || 'Пользователь'}
                </div>
                {person.location ? (
                  <div className={styles.why}>{person.location} · может усилить твою сеть.</div>
                ) : (
                  <div className={styles.why}>Может усилить твою профессиональную сеть.</div>
                )}
              </div>
              <div className={styles.foot}>
                <div className={styles.avaWrap} aria-hidden>
                  {person.avatar ? (
                    <img className={styles.ava} src={person.avatar} alt="" />
                  ) : (
                    <span className={styles.ava}>{person.avatarInitials}</span>
                  )}
                </div>
                <button
                  type="button"
                  className={[styles.cta, isFollowing ? styles.ctaDone : ''].join(' ')}
                  onClick={(e) => {
                    e.stopPropagation()
                    void dispatch(toggleFollow(person.id))
                  }}
                >
                  {isFollowing ? '✓ Подписка' : (<><PlusIcon />&nbsp;Связь</>)}
                </button>
              </div>
            </article>
          ) : null}

          {!loading && showCard('analytics') ? (
          <article
            className={[styles.card, styles.insight].join(' ')}
            role="button"
            tabIndex={0}
            onClick={() => setAnalyticsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setAnalyticsOpen(true)
            }}
          >
            <div className={styles.kind}>Аналитика профиля</div>
            <div className={styles.body}>
              <div className={styles.name}>
                {pulse.views.count} просмотра · {pulse.applications.count} откликов
              </div>
              <div className={styles.metaLine}>{formatDelta(pulse.views.deltaPct)} к прошлой неделе</div>
              <div className={styles.why}>
                Из них {c} — компании-работодатели и {h} — HR. Сильнее, чем у 78% похожих профилей.
              </div>
            </div>
            <div className={styles.foot}>
              <div className={styles.insightChart} aria-hidden>
                {[16, 18, 22, 20, 28, 26, 32, 30, 38, 36, 44, 52, 48, 58].map((bh, i) => (
                  <i key={i} style={{ height: bh + 'px' }} />
                ))}
              </div>
              <button
                type="button"
                className={styles.cta}
                onClick={(e) => {
                  e.stopPropagation()
                  setAnalyticsOpen(true)
                }}
              >
                Изучить подробнее <ArrowIcon />
              </button>
            </div>
          </article>
          ) : null}
        </section>

        {analyticsOpen ? <ProfileAnalyticsModal onClose={() => setAnalyticsOpen(false)} /> : null}
      </>
  )
}
