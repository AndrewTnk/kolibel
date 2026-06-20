import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { loadNetwork } from '../../../features/network/model/networkThunks'
import { BlockSkeleton } from '../Skeleton/Skeleton'
import { HScroll } from '../HScroll/HScroll'
import { useIsMobile } from '../../lib/useMediaQuery'
import styles from './MySubscriptions.module.css'

type Subscription = { id: string; name: string; sub: string; avatar?: string; initial: string; square?: boolean }

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function MySubscriptions({
  horizontal = false,
  embedded = false,
}: {
  horizontal?: boolean
  /** Встроенный режим: без карточки/большого заголовка (внутри блока «Моя сеть»). */
  embedded?: boolean
}) {
  const dispatch = useAppDispatch()
  const isMobile = useIsMobile()
  const hcarousel = horizontal || isMobile
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const people = useAppSelector((s) => s.network.followingPeople)
  const companies = useAppSelector((s) => s.network.followingCompanies)
  const status = useAppSelector((s) => s.network.status)

  useEffect(() => {
    if (status === 'idle') void dispatch(loadNetwork())
  }, [status, dispatch])

  const subscriptions = useMemo<Subscription[]>(
    () => [
      ...people.map((p) => ({
        id: p.id,
        name: p.fullName,
        sub: p.jobTitle || 'Пользователь',
        avatar: p.avatar,
        initial: p.avatarInitials,
      })),
      ...companies.map((c) => ({
        id: c.id,
        name: c.name,
        sub: c.field || 'Компания',
        avatar: c.logo,
        initial: c.logoInitial,
        square: true,
      })),
    ],
    [people, companies],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return subscriptions
    return subscriptions.filter((s) => `${s.name} ${s.sub}`.toLowerCase().includes(q))
  }, [subscriptions, query])

  // Пока сеть грузится и подписок ещё нет — силуэт блока.
  if ((status === 'idle' || status === 'loading') && !subscriptions.length) {
    return <BlockSkeleton height={embedded ? 120 : 220} />
  }

  const inner = (
    <>
      <div className={styles.head}>
        <div className={embedded ? styles.subTitle : styles.title}>
          {embedded ? 'Подписки' : 'Мои подписки'}
        </div>
        {subscriptions.length ? (
          <button
            type="button"
            className={[styles.searchBtn, searchOpen ? styles.searchBtnActive : ''].join(' ')}
            aria-label="Поиск по подпискам"
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((v) => !v)
              if (searchOpen) setQuery('')
            }}
          >
            <SearchIcon />
          </button>
        ) : null}
      </div>

      {searchOpen ? (
        <input
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по подпискам"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      ) : null}

      {(() => {
        if (!subscriptions.length)
          return <div className={styles.empty}>Вы пока ни на кого не подписаны</div>
        if (!filtered.length) return <div className={styles.empty}>Ничего не найдено</div>
        const cards = filtered.map((s) => (
          <Link key={s.id} to={`/u/${s.id}`} className={styles.item}>
            {s.avatar ? (
              <img className={[styles.avatar, s.square ? styles.avatarSquare : ''].join(' ')} src={s.avatar} alt="" />
            ) : (
              <span className={[styles.avatar, s.square ? styles.avatarSquare : ''].join(' ')} aria-hidden>
                {s.initial}
              </span>
            )}
            <span className={styles.meta}>
              <span className={styles.name}>{s.name}</span>
              <span className={styles.sub}>{s.sub}</span>
            </span>
          </Link>
        ))
        return hcarousel ? <HScroll>{cards}</HScroll> : <div className={styles.list}>{cards}</div>
      })()}
    </>
  )

  if (embedded) return <div className={styles.embedded}>{inner}</div>
  return <div className={styles.card}>{inner}</div>
}
