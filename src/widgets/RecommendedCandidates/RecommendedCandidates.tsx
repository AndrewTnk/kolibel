import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { loadNetwork, toggleFollow } from '../../features/network/model/networkThunks'
import { loadVacancies } from '../../features/vacancies/model/vacancyThunks'
import { isPublicVacancy } from '../../features/vacancies/lib/vacancyVisibility'
import type { NetworkPerson } from '../../features/network/model/types'
import { RecCard } from '../../shared/ui/Recommendations/RecCard'
import {
  CandidateProfileModal,
  personToCandidate,
  type CandidateProfile,
} from '../../features/vacancies/ui/CandidateProfileModal/CandidateProfileModal'
import { WriteModal } from '../../features/company/ui/WriteModal/WriteModal'
import { candidateBestMatch } from '../../features/company/lib/candidateMatch'
import { BlockSkeleton } from '../../shared/ui/Skeleton/Skeleton'
import { CompanyBadge } from '../../shared/ui/CompanyBadge/CompanyBadge'
import { HScroll } from '../../shared/ui/HScroll/HScroll'
import styles from './RecommendedCandidates.module.css'

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

/**
 * Рекомендованные кандидаты (правый сайдбар компании). Реальные люди из сети,
 * отфильтрованные по РЕАЛЬНОМУ совпадению (≥80%) с активными вакансиями компании
 * (та же логика, что в карточке «Стоит позвать»). «Написать» → реальный чат.
 */
export function RecommendedCandidates({
  horizontal = false,
  cards = false,
}: { horizontal?: boolean; cards?: boolean } = {}) {
  const dispatch = useAppDispatch()
  const people = useAppSelector((s) => s.network.recommendedPeople)
  const status = useAppSelector((s) => s.network.status)
  const myId = useAppSelector((s) => s.auth.user?.id)
  const vacancies = useAppSelector((s) => s.vacanciesList.items)
  const vacanciesLoaded = useAppSelector((s) => s.vacanciesList.loaded)
  const followingIds = useAppSelector((s) => s.network.followingIds)

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null)
  const [writeTo, setWriteTo] = useState<{ userId: string; name: string } | null>(null)

  useEffect(() => {
    if (status === 'idle') void dispatch(loadNetwork())
  }, [status, dispatch])
  useEffect(() => {
    if (!vacancies.length && !vacanciesLoaded) void dispatch(loadVacancies())
  }, [vacancies.length, vacanciesLoaded, dispatch])

  // Активные вакансии компании — для матчинга (пауза/черновик/закрытая не считаются).
  const activeVacancies = useMemo(
    () => vacancies.filter((v) => v.companyId && v.companyId === myId && isPublicVacancy(v)),
    [vacancies, myId],
  )
  const vacancyTitle = activeVacancies[0]?.title

  // Только кандидаты с сильным совпадением (≥80%) под активные вакансии, по убыванию матча.
  const MATCH_THRESHOLD = 80
  const eligible = useMemo(() => {
    const out: { person: NetworkPerson; score: number }[] = []
    if (!activeVacancies.length) return out
    for (const p of people) {
      if (p.id === myId) continue
      const score = candidateBestMatch(p, activeVacancies)
      if (score != null && score >= MATCH_THRESHOLD) out.push({ person: p, score })
    }
    out.sort((a, b) => b.score - a.score)
    return out.slice(0, 8)
  }, [people, myId, activeVacancies])

  const loading = status === 'idle' || status === 'loading' || !vacanciesLoaded

  const items = eligible.map(({ person: p, score }) => {
    // Мобильная карусель — карточки в стиле пользователя (баннер+фото) + % совпадения над кнопкой.
    if (cards) {
      return (
        <RecCard
          key={p.id}
          to={`/u/${p.id}`}
          name={p.fullName}
          sub={p.jobTitle || 'Специалист'}
          initial={p.avatarInitials}
          avatar={p.avatar}
          banner={p.banner}
          bg={p.bg}
          info={`${score}% совпадение`}
          following={followingIds.includes(p.id)}
          onToggle={() => dispatch(toggleFollow(p.id))}
        />
      )
    }
    return (
      <div
        key={p.id}
        className={styles.item}
        role="button"
        tabIndex={0}
        onClick={() => setCandidate(personToCandidate(p, { score }))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setCandidate(personToCandidate(p, { score }))
        }}
      >
        {p.avatar ? (
          <img className={styles.ava} src={p.avatar} alt="" />
        ) : (
          <span className={styles.ava}>{p.avatarInitials}</span>
        )}
        <div className={styles.meta}>
          <div className={styles.name}>
            {p.fullName}
            <CompanyBadge logo={p.companyLogo} title={p.company} size={13} />
          </div>
          <div className={styles.role}>
            {[p.jobTitle, p.company].filter(Boolean).join(' · ') || 'Специалист'}
          </div>
          <div className={styles.match}>{score}% совпадение</div>
        </div>
        <button
          type="button"
          className={styles.write}
          title="Написать"
          aria-label={`Написать · ${p.fullName}`}
          onClick={(e) => {
            e.stopPropagation()
            setWriteTo({ userId: p.id, name: p.fullName })
          }}
        >
          <SendIcon />
        </button>
      </div>
    )
  })

  const skeletons = [
    <BlockSkeleton key="s1" height={56} />,
    <BlockSkeleton key="s2" height={56} />,
    <BlockSkeleton key="s3" height={56} />,
  ]

  return (
    <div className={styles.card}>
      <div className={styles.title}>Рекомендованные кандидаты</div>

      {loading && !eligible.length ? (
        horizontal ? (
          <HScroll className={styles.hlist}>{skeletons}</HScroll>
        ) : (
          <div className={styles.list}>{skeletons}</div>
        )
      ) : !activeVacancies.length ? (
        <div className={styles.empty}>Опубликуй вакансию, чтобы увидеть подходящих кандидатов.</div>
      ) : eligible.length ? (
        horizontal ? (
          <HScroll className={styles.hlist}>{items}</HScroll>
        ) : (
          <div className={styles.list}>{items}</div>
        )
      ) : (
        <div className={styles.empty}>Пока нет кандидатов с совпадением 80%+ под твои вакансии.</div>
      )}

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
        <WriteModal
          userId={writeTo.userId}
          name={writeTo.name}
          vacancyTitle={vacancyTitle}
          onClose={() => setWriteTo(null)}
        />
      ) : null}
    </div>
  )
}
