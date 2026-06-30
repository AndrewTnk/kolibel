import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { incrementVacancyView, loadVacancies } from '../../features/vacancies/model/vacancyThunks'
import { vacanciesActions } from '../../features/vacancies/model/vacanciesSlice'
import { formatSalary } from '../../features/vacancies/lib/labels'
import { computeMatch, resumeToMatchProfile } from '../../features/vacancies/lib/useVacancyMatch'
import { isPublicVacancy } from '../../features/vacancies/lib/vacancyVisibility'
import { loadNetwork, toggleFollow } from '../../features/network/model/networkThunks'
import { useRecommendations } from '../../features/network/lib/useRecommendations'
import { spread } from '../../features/network/lib/recommend'
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

/** Склонение слова «пользователь» по числу: 1 — пользователь, 2–4 — пользователя, иначе — пользователей. */
function pluralUsers(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'пользователь'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'пользователя'
  return 'пользователей'
}

/** Полоса «Сегодня для тебя» — три карточки-возможности (только user-режим). */
export function TodayRow() {
  const dispatch = useAppDispatch()
  const nav = useNavigate()

  const vacancies = useAppSelector((s) => s.vacanciesList.items)
  const vacanciesLoaded = useAppSelector((s) => s.vacanciesList.loaded)
  const resume = useAppSelector((s) => s.profile.resume)
  const appliedIds = useAppSelector((s) => s.vacancies.appliedIds)
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const networkStatus = useAppSelector((s) => s.network.status)
  // Ранжированные рекомендации (своя компания/навыки/похожая профессия/популярность/
  // общие связи) — общая система рекомендаций сети.
  const { scoredPeople } = useRecommendations()
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

  // Топ-вакансия = с самым высоким совпадением по профилю (лексический движок).
  // Только активные — пауза/черновик/закрытая в подборку не попадают.
  const { vacancy, matchScore } = useMemo(() => {
    const pool = vacancies.filter(isPublicVacancy)
    if (!pool.length) return { vacancy: undefined, matchScore: null as number | null }
    const profile = resumeToMatchProfile(resume)
    let best = pool[0]
    let bestScore = computeMatch(best, profile).score ?? -1
    for (let i = 1; i < pool.length; i++) {
      const sc = computeMatch(pool[i], profile).score ?? -1
      if (sc > bestScore) {
        best = pool[i]
        bestScore = sc
      }
    }
    return { vacancy: best, matchScore: bestScore >= 0 ? bestScore : null }
  }, [vacancies, resume])
  // Вакансия «новая», если опубликована за последние 7 дней.
  const isNewVacancy = !!vacancy && Date.now() - vacancy.postedAt < 7 * 24 * 60 * 60 * 1000
  // Уже откликнулся на эту вакансию.
  const applied = !!vacancy && appliedIds.includes(vacancy.id)
  // Открыть карточку вакансии (модалка) + засчитать просмотр. Клик по всей карточке и по CTA.
  const openVacancy = () => {
    if (!vacancy) return
    dispatch(vacanciesActions.openVacancy(vacancy.id))
    void dispatch(incrementVacancyView(vacancy.id))
  }
  // «Стоит познакомиться»: берём лучшего по интересу кандидата, ИСКЛЮЧАЯ тех, на кого
  // уже подписан (показываем только потенциально новые связи). Выбор замораживаем на
  // монтаж (ref) — иначе карточка «перепрыгнула» бы на другого человека сразу после
  // клика «Связь» (после подписки он бы выпал из пула). Подписавшись на показанного,
  // видим состояние «✓ Связь», карточка не меняется.
  const chosenPersonId = useRef<string | null>(null)
  const person = useMemo(() => {
    const pool = spread(scoredPeople).map((s) => s.item)
    if (chosenPersonId.current) {
      const kept = pool.find((p) => p.id === chosenPersonId.current)
      if (kept) return kept
    }
    const next = pool.find((p) => !followingIds.includes(p.id))
    chosenPersonId.current = next?.id ?? null
    return next
  }, [scoredPeople, followingIds])
  const isFollowing = person ? followingIds.includes(person.id) : false

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
              <BlockSkeleton height={200} radius={16} />
            ) : (
              <>
                <BlockSkeleton height={200} radius={16} />
                <BlockSkeleton height={200} radius={16} />
                <BlockSkeleton height={200} radius={16} />
              </>
            )
          ) : null}
          {!loading && vacancy && showCard('vacancy') ? (
            <article
              className={[styles.card, styles.match].join(' ')}
              role="button"
              tabIndex={0}
              onClick={openVacancy}
              onKeyDown={(e) => {
                if (e.key === 'Enter') openVacancy()
              }}
            >
              <div className={styles.kind}>
                Совпадение по вакансии {isNewVacancy ? <span className={styles.badge}>новое</span> : null}
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
                <div
                  className={styles.fitPill}
                  style={matchScore != null ? ({ ['--p']: `${matchScore}%` } as CSSProperties) : undefined}
                  title={matchScore != null ? `Совпадение ${matchScore}%` : 'Подходит тебе'}
                  aria-label={matchScore != null ? `Совпадение ${matchScore}%` : 'Подходит тебе'}
                >
                  <span>{matchScore != null ? `${matchScore}%` : '✓'}</span>
                </div>
                <button
                  type="button"
                  className={[styles.cta, applied ? styles.ctaDone : ''].join(' ')}
                  onClick={(e) => {
                    e.stopPropagation()
                    openVacancy()
                  }}
                >
                  {applied ? '✓ Откликнулся' : (<>Откликнуться <ArrowIcon /></>)}
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
                  {isFollowing ? '✓ Связь' : (<><PlusIcon />&nbsp;Связь</>)}
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
                Из них {pulse.viewers.companies} — компании и {pulse.viewers.users} —{' '}
                {pluralUsers(pulse.viewers.users)}. Сильнее, чем у {pulse.percentile}% похожих профилей.
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
