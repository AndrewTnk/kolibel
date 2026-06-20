import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { loadNetwork } from '../../features/network/model/networkThunks'
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
 * процент совпадения — мок (детерминирован по id). «Написать» → реальный чат.
 */
export function RecommendedCandidates({ horizontal = false }: { horizontal?: boolean } = {}) {
  const dispatch = useAppDispatch()
  const people = useAppSelector((s) => s.network.recommendedPeople)
  const status = useAppSelector((s) => s.network.status)
  const myId = useAppSelector((s) => s.auth.user?.id)
  const vacancies = useAppSelector((s) => s.vacanciesList.items)

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null)
  const [writeTo, setWriteTo] = useState<{ userId: string; name: string } | null>(null)

  useEffect(() => {
    if (status === 'idle') void dispatch(loadNetwork())
  }, [status, dispatch])

  // Вакансии компании — для матчинга и текста «зовём под вакансию».
  const myVacancies = useMemo(
    () => vacancies.filter((v) => v.companyId && v.companyId === myId),
    [vacancies, myId],
  )
  const vacancyTitle = myVacancies[0]?.title

  const top = useMemo(() => people.filter((p) => p.id !== myId).slice(0, 3), [people, myId])
  const loading = status === 'idle' || status === 'loading'

  const items = top.map((p) => {
    const score = candidateBestMatch(p, myVacancies)
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
          {score != null ? <div className={styles.match}>{score}% совпадение</div> : null}
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

      {loading && !top.length ? (
        horizontal ? (
          <HScroll className={styles.hlist}>{skeletons}</HScroll>
        ) : (
          <div className={styles.list}>{skeletons}</div>
        )
      ) : top.length ? (
        horizontal ? (
          <HScroll className={styles.hlist}>{items}</HScroll>
        ) : (
          <div className={styles.list}>{items}</div>
        )
      ) : (
        <div className={styles.empty}>Пока некого рекомендовать.</div>
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
