import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { loadNetwork, toggleFollow } from '../../../features/network/model/networkThunks'
import { spread } from '../../../features/network/lib/recommend'
import { useRecommendations } from '../../../features/network/lib/useRecommendations'
import type { NetworkPerson } from '../../../features/network/model/types'
import { RecRow } from './RecRow'
import { RecSkeleton } from './RecSkeleton'
import { HScroll } from '../HScroll/HScroll'
import { useIsMobile } from '../../lib/useMediaQuery'
import styles from './Recommendations.module.css'

export function RecommendedPeople({
  title = 'Рекомендованные пользователи',
  horizontal = false,
  loading = false,
}: {
  title?: string
  horizontal?: boolean
  /** Принудительный скелетон (напр. пока грузится страница, где живёт блок). */
  loading?: boolean
}) {
  const dispatch = useAppDispatch()
  const isMobile = useIsMobile()
  const hcarousel = horizontal || isMobile
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const status = useAppSelector((s) => s.network.status)

  // Единая система рекомендаций (скоринг + свежесть на каждый монтаж).
  const { scoredPeople, recordShown } = useRecommendations()
  const limit = hcarousel ? 10 : 3
  const people = spread(scoredPeople)
    .slice(0, limit)
    .map((s) => s.item)

  useEffect(() => {
    if (status === 'idle') void dispatch(loadNetwork())
  }, [status, dispatch])

  // Запомнить показанных один раз (когда данные появились) — чтобы при следующем заходе всплыли другие.
  const recorded = useRef(false)
  useEffect(() => {
    if (recorded.current || !people.length) return
    recordShown(people.map((p) => p.id))
    recorded.current = true
  }, [people, recordShown])

  if (loading) return <RecSkeleton />

  if (!people.length) {
    if (status === 'ready' || status === 'error') return null
    return <RecSkeleton />
  }

  const card = (p: NetworkPerson) => (
    <RecRow
      key={p.id}
      to={`/u/${p.id}`}
      name={p.fullName}
      sub={[p.jobTitle, p.company].filter(Boolean).join(' · ') || 'Пользователь'}
      initial={p.avatarInitials}
      avatar={p.avatar}
      logo={p.companyLogo}
      logoTitle={p.company}
      following={followingIds.includes(p.id)}
      onToggle={() => dispatch(toggleFollow(p.id))}
    />
  )

  return (
    <div className={styles.sideCard}>
      <div className={styles.sideTitle}>{title}</div>

      {hcarousel ? (
        <HScroll>{people.map(card)}</HScroll>
      ) : (
        <div className={styles.recRowList}>{people.map(card)}</div>
      )}

      {!hcarousel ? (
        <Link className={styles.recShowAll} to="/network">
          Посмотреть все →
        </Link>
      ) : null}
    </div>
  )
}
