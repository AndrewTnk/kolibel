import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { networkActions } from '../../features/network/model/networkSlice'
import { NetworkPersonCard } from '../../features/network/ui/NetworkPersonCard'
import { NetworkCompanyCard } from '../../features/network/ui/NetworkCompanyCard'
import { NetIco } from '../../features/network/ui/netIcons'
import { spread, type ScoredAny } from '../../features/network/lib/recommend'
import { useRecommendations } from '../../features/network/lib/useRecommendations'
import styles from './NetworkRecommendations.module.css'

type Tab = 'all' | 'people' | 'companies'

type Props = {
  onFollow: (id: string) => void
}

const PAGE = 8

export function NetworkRecommendations({ onFollow }: Props) {
  const dispatch = useAppDispatch()
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const followingSet = useMemo(() => new Set(followingIds), [followingIds])
  // Поиск общий со стором — чтобы хедер-поиск (мобилка) фильтровал этот же блок.
  const q = useAppSelector((s) => s.network.recSearch)

  const { scoredPeople, scoredCompanies, recordShown } = useRecommendations()

  const [tab, setTab] = useState<Tab>('all')
  const [shown, setShown] = useState(PAGE)

  // Запомнить показанные id один раз за монтаж — чтобы при следующей загрузке всплыли другие.
  const recorded = useRef(false)
  useEffect(() => {
    if (recorded.current || (!scoredPeople.length && !scoredCompanies.length)) return
    const top = spread([...scoredPeople, ...scoredCompanies].sort((a, b) => b.score - a.score)).slice(0, PAGE)
    recordShown(top.map((t) => t.item.id))
    recorded.current = true
  }, [scoredPeople, scoredCompanies, recordShown])

  const { items, counts } = useMemo(() => {
    const s = q.trim().toLowerCase()
    let pp = scoredPeople
    let cc = scoredCompanies
    if (s) {
      pp = pp.filter(({ item: p }) =>
        `${p.fullName} ${p.jobTitle} ${p.company ?? ''}`.toLowerCase().includes(s),
      )
      cc = cc.filter(({ item: c }) => `${c.name} ${c.field}`.toLowerCase().includes(s))
    }
    const cnt = { all: pp.length + cc.length, people: pp.length, companies: cc.length }

    let list: ScoredAny[]
    if (tab === 'people') list = spread(pp)
    else if (tab === 'companies') list = spread(cc)
    else list = spread([...pp, ...cc].sort((a, b) => b.score - a.score))
    return { items: list, counts: cnt }
  }, [scoredPeople, scoredCompanies, tab, q])

  // Сброс пагинации при смене вкладки/поиска.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setShown(PAGE), [tab, q])

  const visible = items.slice(0, shown)
  const hasMore = shown < items.length

  return (
    <div className={styles.block}>
      {/* табы + поиск */}
      <div className={styles.tabsRow}>
        <div className={styles.tabBtns}>
          <button className={[styles.tab, tab === 'all' ? styles.tabOn : ''].join(' ')} onClick={() => setTab('all')}>
            Все <span className={styles.tabN}>{counts.all}</span>
          </button>
          <button
            className={[styles.tab, tab === 'people' ? styles.tabOn : ''].join(' ')}
            onClick={() => setTab('people')}
          >
            <NetIco.User width={15} height={15} /> Люди <span className={styles.tabN}>{counts.people}</span>
          </button>
          <button
            className={[styles.tab, tab === 'companies' ? styles.tabOn : ''].join(' ')}
            onClick={() => setTab('companies')}
          >
            <NetIco.Building width={15} height={15} /> Компании <span className={styles.tabN}>{counts.companies}</span>
          </button>
        </div>
        <div className={[styles.searchWrap, 'hideOnMobile'].join(' ')}>
          <div className={styles.searchInline}>
            <NetIco.Search />
            <input
              value={q}
              onChange={(e) => dispatch(networkActions.setRecSearch(e.target.value))}
              placeholder="Поиск среди рекомендаций"
            />
          </div>
        </div>
      </div>

      {/* грид */}
      {visible.length === 0 ? (
        <div className={styles.empty}>Ничего не нашлось — попробуй изменить запрос</div>
      ) : (
        <div className={styles.peopleGrid}>
          {visible.map((it) =>
            it.kind === 'person' ? (
              <NetworkPersonCard
                key={`p-${it.item.id}`}
                person={it.item}
                to={`/u/${it.item.id}?from=network`}
                isFollowing={followingSet.has(it.item.id)}
                onFollow={onFollow}
              />
            ) : (
              <NetworkCompanyCard
                key={`c-${it.item.id}`}
                company={it.item}
                to={`/u/${it.item.id}?from=network`}
                isFollowing={followingSet.has(it.item.id)}
                onFollow={onFollow}
              />
            ),
          )}
        </div>
      )}

      {hasMore ? (
        <button type="button" className={styles.showMore} onClick={() => setShown((s) => s + PAGE)}>
          Показать ещё ({items.length - shown})
        </button>
      ) : null}
    </div>
  )
}
