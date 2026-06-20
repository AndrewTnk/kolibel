import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { loadNetwork, toggleFollow } from '../../../features/network/model/networkThunks'
import { spread } from '../../../features/network/lib/recommend'
import { useRecommendations } from '../../../features/network/lib/useRecommendations'
import type { Company } from '../../../features/network/model/types'
import { RecRow } from './RecRow'
import { RecModal } from './RecModal'
import { RecSkeleton } from './RecSkeleton'
import { HScroll } from '../HScroll/HScroll'
import { useIsMobile } from '../../lib/useMediaQuery'
import styles from './Recommendations.module.css'

export function RecommendedCompanies({
  title = 'Рекомендованные компании',
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
  const [open, setOpen] = useState(false)
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const status = useAppSelector((s) => s.network.status)

  // Единая система рекомендаций (скоринг + свежесть на каждый монтаж).
  const { scoredCompanies, recordShown } = useRecommendations()
  const ranked = spread(scoredCompanies).map((s) => s.item)
  const limit = hcarousel ? 10 : 3
  const companies = ranked.slice(0, limit)

  useEffect(() => {
    if (status === 'idle') void dispatch(loadNetwork())
  }, [status, dispatch])

  // Запомнить показанных один раз (когда данные появились) — чтобы при следующем заходе всплыли другие.
  const recorded = useRef(false)
  useEffect(() => {
    if (recorded.current || !companies.length) return
    recordShown(companies.map((c) => c.id))
    recorded.current = true
  }, [companies, recordShown])

  if (loading) return <RecSkeleton />

  if (!ranked.length) {
    if (status === 'ready' || status === 'error') return null
    return <RecSkeleton />
  }

  const item = (c: Company) => (
    <RecRow
      key={c.id}
      to={`/u/${c.id}`}
      name={c.name}
      sub={c.field || 'Компания'}
      initial={c.logoInitial}
      avatar={c.logo}
      square
      following={followingIds.includes(c.id)}
      onToggle={() => dispatch(toggleFollow(c.id))}
    />
  )

  return (
    <div className={styles.sideCard}>
      <div className={styles.sideTitle}>{title}</div>

      {hcarousel ? (
        <HScroll>{companies.map(item)}</HScroll>
      ) : (
        <div className={styles.recRowList}>{companies.map(item)}</div>
      )}

      {!hcarousel && ranked.length > 3 ? (
        <button type="button" className={styles.recShowAll} onClick={() => setOpen(true)}>
          Посмотреть все →
        </button>
      ) : null}

      {open ? (
        <RecModal title={title} onClose={() => setOpen(false)}>
          <div className={styles.recRowList}>{ranked.map(item)}</div>
        </RecModal>
      ) : null}
    </div>
  )
}
