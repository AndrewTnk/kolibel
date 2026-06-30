import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { loadVacancies } from '../../features/vacancies/model/vacancyThunks'
import { fetchOwnerApplications } from '../../features/vacancies/lib/applicationsApi'
import { isPublicVacancy } from '../../features/vacancies/lib/vacancyVisibility'
import type { Applicant } from '../../features/vacancies/model/types'
import { loadNetwork } from '../../features/network/model/networkThunks'
import { computeMatch, personToMatchProfile } from '../../features/vacancies/lib/useVacancyMatch'
import type { NetworkPerson } from '../../features/network/model/types'
import {
  CandidateProfileModal,
  personToCandidate,
  type CandidateProfile,
} from '../../features/vacancies/ui/CandidateProfileModal/CandidateProfileModal'
import { WriteModal } from '../../features/company/ui/WriteModal/WriteModal'
import { CompanyAnalyticsModal } from '../../features/company/ui/CompanyAnalyticsModal/CompanyAnalyticsModal'
import { useCompanyPulse } from '../../features/company/lib/useCompanyPulse'
import { formatDelta } from '../../features/profile/lib/useProfilePulse'
import { useIsMobile } from '../../shared/lib/useMediaQuery'
import { BlockSkeleton } from '../../shared/ui/Skeleton/Skeleton'
import { CompanyBadge } from '../../shared/ui/CompanyBadge/CompanyBadge'
import styles from './CompanyTodayRow.module.css'

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

/** Склонение слова «отклик» по числу: 1 — отклик, 2–4 — отклика, иначе — откликов. */
function pluralResponses(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'отклик'
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'отклика'
  return 'откликов'
}

/** Полоса «Сегодня для компании» — три карточки (только company-режим). */
export function CompanyTodayRow() {
  const dispatch = useAppDispatch()
  const nav = useNavigate()

  const myId = useAppSelector((s) => s.auth.user?.id)
  const allVacancies = useAppSelector((s) => s.vacanciesList.items)
  const vacanciesLoaded = useAppSelector((s) => s.vacanciesList.loaded)
  const people = useAppSelector((s) => s.network.recommendedPeople)
  const networkStatus = useAppSelector((s) => s.network.status)
  const pulse = useCompanyPulse()
  const isMobile = useIsMobile()
  // Сид выбора случайной карточки — раз на монтаж (новый на каждый заход/обновление страницы).
  const [pickSeed] = useState(() => Math.random())

  const [applicantsByVacancy, setApplicantsByVacancy] = useState<Record<string, Applicant[]>>({})
  const [appsLoading, setAppsLoading] = useState(true)

  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null)
  const [writeTo, setWriteTo] = useState<{ userId: string; name: string } | null>(null)

  useEffect(() => {
    if (!allVacancies.length && !vacanciesLoaded) void dispatch(loadVacancies())
  }, [allVacancies.length, vacanciesLoaded, dispatch])
  useEffect(() => {
    if (networkStatus === 'idle') void dispatch(loadNetwork())
  }, [networkStatus, dispatch])
  useEffect(() => {
    let alive = true
    fetchOwnerApplications()
      .then((g) => {
        if (alive) setApplicantsByVacancy(g)
      })
      .catch(() => {
        if (alive) setApplicantsByVacancy({})
      })
      .finally(() => {
        if (alive) setAppsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const myVacancies = useMemo(
    () => allVacancies.filter((v) => v.companyId && v.companyId === myId),
    [allVacancies, myId],
  )
  // Только активные вакансии — пауза/черновик/закрытая в блоке не показываются.
  const activeVacancies = useMemo(() => myVacancies.filter(isPublicVacancy), [myVacancies])
  const topVacancyTitle = activeVacancies[0]?.title

  // Вакансия для карточки «Новые отклики». Приоритет — вакансии с НОВЫМИ (status==='new',
  // ещё не просмотренными) откликами: показываем СЛУЧАЙНУЮ из них (новая при каждом заходе),
  // чтобы постоянно «всплывали» разные вакансии, по которым есть новые отклики. Когда новые
  // просмотрены и таких вакансий не осталось — показываем вакансию с наибольшим числом откликов.
  const topApplied = useMemo(() => {
    const entries = activeVacancies
      .map((v) => {
        const list = applicantsByVacancy[v.id] ?? []
        const newCount = list.filter((a) => a.status === 'new').length
        return { vacancy: v, list, newCount }
      })
      .filter((e) => e.list.length > 0)
    if (!entries.length) return null
    const withNew = entries.filter((e) => e.newCount > 0)
    if (withNew.length) {
      const i = Math.min(Math.floor(pickSeed * withNew.length), withNew.length - 1)
      return withNew[i]
    }
    return entries.reduce((best, e) => (e.list.length > best.list.length ? e : best), entries[0])
  }, [applicantsByVacancy, activeVacancies, pickSeed])

  // Подбор «Стоит позвать»: реальный лексический матч каждого рекомендованного человека
  // против АКТИВНЫХ вакансий компании; берём только сильные совпадения (≥80%) и
  // показываем СЛУЧАЙНОГО из них (новый при каждом заходе/обновлении — сид pickSeed).
  const MATCH_THRESHOLD = 80
  const eligibleCandidates = useMemo(() => {
    const out: { person: NetworkPerson; score: number; vacancyTitle: string }[] = []
    if (!activeVacancies.length) return out
    for (const p of people) {
      if (p.id === myId) continue
      const profile = personToMatchProfile(p)
      let best = -1
      let bestTitle = ''
      for (const v of activeVacancies) {
        const m = computeMatch(v, profile)
        if (m.score != null && m.score > best) {
          best = m.score
          bestTitle = v.title
        }
      }
      if (best >= MATCH_THRESHOLD) out.push({ person: p, score: best, vacancyTitle: bestTitle })
    }
    return out
  }, [people, myId, activeVacancies])

  const picked = useMemo(() => {
    if (!eligibleCandidates.length) return null
    const i = Math.min(Math.floor(pickSeed * eligibleCandidates.length), eligibleCandidates.length - 1)
    return eligibleCandidates[i]
  }, [eligibleCandidates, pickSeed])

  const loading = appsLoading || (!vacanciesLoaded && !allVacancies.length) || networkStatus === 'idle' || networkStatus === 'loading'

  // На мобилке показываем ОДНУ случайную карточку из трёх (все три всегда доступны).
  const cards = ['applications', 'sourcing', 'analytics'] as const
  const chosenCard = cards[Math.floor(pickSeed * cards.length)]
  const showCard = (k: (typeof cards)[number]) => !isMobile || chosenCard === k

  return (
    <>
      <div className={styles.head}>
        <div className={styles.title}>Сегодня для компании</div>
        <div className={styles.meta}>по твоим вакансиям и активности страницы</div>
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
        ) : (
          <>
            {/* 1. Новые отклики */}
            {showCard('applications') ? renderApplicationsCard() : null}

            {/* 2. Стоит позвать */}
            {showCard('sourcing') ? (
              !activeVacancies.length ? (
                // Нет активных вакансий — не с чем матчить кандидатов, зовём создать вакансию.
                <article
                  className={[styles.card, styles.person].join(' ')}
                  role="button"
                  tabIndex={0}
                  onClick={() => nav('/my-vacancies')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') nav('/my-vacancies')
                  }}
                >
                  <div className={styles.kind}>Стоит позвать</div>
                  <div className={styles.body}>
                    <div className={styles.name}>Создай вакансию</div>
                    <div className={styles.why}>
                      Опубликуй вакансию — и здесь появятся подходящие кандидаты из твоей сети.
                    </div>
                  </div>
                  <div className={styles.foot}>
                    <div />
                    <button type="button" className={styles.cta} onClick={(e) => { e.stopPropagation(); nav('/my-vacancies') }}>
                      Создать вакансию <ArrowIcon />
                    </button>
                  </div>
                </article>
              ) : picked ? (
                <article
                  className={[styles.card, styles.person].join(' ')}
                  role="button"
                  tabIndex={0}
                  onClick={() => setCandidate(personToCandidate(picked.person, { score: picked.score }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setCandidate(personToCandidate(picked.person, { score: picked.score }))
                  }}
                >
                  <div className={styles.kind}>Стоит позвать</div>
                  <div className={styles.body}>
                    <div className={styles.name}>
                      {picked.person.fullName}
                      <CompanyBadge logo={picked.person.companyLogo} title={picked.person.company} size={14} />
                    </div>
                    <div className={styles.metaLine}>
                      {[picked.person.jobTitle, picked.person.company, picked.person.location].filter(Boolean).join(' · ') || 'Специалист'}
                    </div>
                    <div className={styles.why}>
                      Совпадает с вакансией «{picked.vacancyTitle}» на {picked.score}%.
                    </div>
                  </div>
                  <div className={styles.foot}>
                    <div className={styles.matchRing} style={{ '--p': `${picked.score}%` } as React.CSSProperties}>
                      <span>{picked.score}%</span>
                    </div>
                    <button
                      type="button"
                      className={styles.cta}
                      onClick={(e) => {
                        e.stopPropagation()
                        setWriteTo({ userId: picked.person.id, name: picked.person.fullName })
                      }}
                    >
                      <SendIcon />&nbsp;Написать
                    </button>
                  </div>
                </article>
              ) : (
                // Вакансии есть, но нет кандидатов с сильным совпадением (≥80%).
                <article className={[styles.card, styles.person].join(' ')}>
                  <div className={styles.kind}>Стоит позвать</div>
                  <div className={styles.body}>
                    <div className={styles.name}>Пока нет сильных совпадений</div>
                    <div className={styles.why}>
                      Кандидаты с совпадением 80%+ под твои вакансии появятся, когда подрастёт сеть.
                    </div>
                  </div>
                </article>
              )
            ) : null}

            {/* 3. Аналитика компании */}
            {showCard('analytics') ? (
            <article
              className={[styles.card, styles.insight].join(' ')}
              role="button"
              tabIndex={0}
              onClick={() => setAnalyticsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setAnalyticsOpen(true)
              }}
            >
              <div className={styles.kind}>Аналитика компании</div>
              <div className={styles.body}>
                <div className={styles.name}>{pulse.pageViews.count.toLocaleString('ru-RU')} просмотров страницы</div>
                <div className={styles.metaLine}>{formatDelta(pulse.pageViews.deltaPct)} к прошлой неделе</div>
                <div className={styles.why}>
                  Вакансии посмотрели {pulse.vacancyViews.count.toLocaleString('ru-RU')} раз, {pulse.applications.count} человек перешли к отклику.
                </div>
              </div>
              <div className={styles.foot}>
                <div className={styles.insightChart} aria-hidden>
                  {[18, 16, 24, 22, 30, 28, 34, 32, 40, 38, 46, 54, 50, 60].map((h, i) => (
                    <i key={i} style={{ height: h + 'px' }} />
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
          </>
        )}
      </section>

      {analyticsOpen ? <CompanyAnalyticsModal onClose={() => setAnalyticsOpen(false)} /> : null}
      {candidate ? (
        <CandidateProfileModal
          candidate={candidate}
          onWrite={(c) => {
            setCandidate(null)
            setWriteTo({ userId: c.userId, name: c.name })
          }}
          onClose={() => setCandidate(null)}
        />
      ) : null}
      {writeTo ? (
        <WriteModal userId={writeTo.userId} name={writeTo.name} vacancyTitle={topVacancyTitle} onClose={() => setWriteTo(null)} />
      ) : null}
    </>
  )

  function renderApplicationsCard() {
    // Нет активных вакансий (совсем нет / все на паузе / закрыты) — зовём создать вакансию.
    if (!activeVacancies.length) {
      const hasVacancies = myVacancies.length > 0
      return (
        <article
          className={[styles.card, styles.match].join(' ')}
          role="button"
          tabIndex={0}
          onClick={() => nav('/my-vacancies')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') nav('/my-vacancies')
          }}
        >
          <div className={styles.kind}>Отклики</div>
          <div className={styles.body}>
            <div className={styles.name}>{hasVacancies ? 'Нет активных вакансий' : 'Пока нет вакансий'}</div>
            <div className={styles.why}>
              {hasVacancies
                ? 'Активируй или создай вакансию, чтобы получать по ней отклики.'
                : 'Создай вакансию, чтобы видеть по ней отклики кандидатов.'}
            </div>
          </div>
          <div className={styles.foot}>
            <div />
            <button type="button" className={styles.cta} onClick={(e) => { e.stopPropagation(); nav('/my-vacancies') }}>
              {hasVacancies ? 'Мои вакансии' : 'Создать вакансию'} <ArrowIcon />
            </button>
          </div>
        </article>
      )
    }

    const list = topApplied?.list ?? []
    const newCount = topApplied?.newCount ?? 0
    const vacTitle = topApplied?.vacancy?.title ?? topVacancyTitle ?? 'Вакансия'

    return (
      <article
        className={[styles.card, styles.match].join(' ')}
        role="button"
        tabIndex={0}
        onClick={() => nav('/my-vacancies')}
        onKeyDown={(e) => {
          if (e.key === 'Enter') nav('/my-vacancies')
        }}
      >
        <div className={styles.kind}>
          Новые отклики{newCount > 0 ? <span className={styles.badge}>+{newCount} {newCount === 1 ? 'новый' : 'новых'}</span> : null}
        </div>
        <div className={styles.body}>
          <div className={styles.name}>{vacTitle}</div>
          <div className={styles.metaLine}>
            {list.length} {pluralResponses(list.length)} всего
            {newCount > 0 ? ` · ${newCount} ещё не ${newCount === 1 ? 'просмотрен' : 'просмотрены'}` : ''}
          </div>
          <div className={styles.why}>
            {list.length ? 'Загляни в воронку — кандидаты ждут ответа.' : 'Пока никто не откликнулся на эту вакансию.'}
          </div>
        </div>
        <div className={styles.foot}>
          {list.length ? (
            <div className={styles.todayApplicants} aria-hidden>
              {list.slice(0, 2).map((a) => (
                <span key={a.id} className={styles.ava}>
                  {a.avatar ? <img src={a.avatar} alt="" className={styles.avaImg} /> : a.avatarInitials}
                </span>
              ))}
              {list.length > 2 ? <span className={styles.ava}>+{list.length - 2}</span> : null}
            </div>
          ) : null}
          <button type="button" className={styles.cta} onClick={(e) => { e.stopPropagation(); nav('/my-vacancies') }}>
            Смотреть отклики <ArrowIcon />
          </button>
        </div>
      </article>
    )
  }
}
