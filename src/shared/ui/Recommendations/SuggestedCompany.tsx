import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { loadNetwork, toggleFollow } from '../../../features/network/model/networkThunks'
import { RecSkeleton } from './RecSkeleton'
import styles from './Recommendations.module.css'

/** Промо-блок «Возможно будет интересно» — реальная компания, на которую вы ещё не подписаны. */
export function SuggestedCompany() {
  const dispatch = useAppDispatch()
  const companies = useAppSelector((s) => s.network.recommendedCompanies)
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const status = useAppSelector((s) => s.network.status)

  useEffect(() => {
    if (status === 'idle') void dispatch(loadNetwork())
  }, [status, dispatch])

  const promo = companies.find((c) => !followingIds.includes(c.id)) ?? companies[0]
  if (!promo) {
    if (status === 'idle' || status === 'loading') return <RecSkeleton height={180} />
    return null
  }

  const following = followingIds.includes(promo.id)

  return (
    <div className={styles.sideCard}>
      <div className={styles.promoTitle}>Возможно будет интересно</div>

      <Link to={`/u/${promo.id}`} className={styles.promoHead} style={{ textDecoration: 'none', color: 'inherit' }}>
        {promo.logo ? (
          <img className={styles.promoLogo} style={{ objectFit: 'cover' }} src={promo.logo} alt="" />
        ) : (
          <div className={styles.promoLogo} aria-hidden>
            {promo.logoInitial}
          </div>
        )}
        <div className={styles.promoMeta}>
          <div className={styles.promoName}>{promo.name}</div>
          <div className={styles.promoField}>{promo.field || 'Компания'}</div>
        </div>
      </Link>

      {promo.about ? <p className={styles.promoDesc}>{promo.about}</p> : null}

      <button
        type="button"
        className={[styles.promoBtn, following ? styles.promoBtnDone : ''].join(' ')}
        onClick={() => dispatch(toggleFollow(promo.id))}
      >
        {following ? 'Вы подписаны' : 'Подписаться'}
      </button>
    </div>
  )
}
