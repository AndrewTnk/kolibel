import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../app/store/hooks'
import type { GraphNodeData } from '../../features/network/lib/connectionsGraph'
import type { GraphFilter } from '../../features/network/ui/RelationGraph'
import type { CompositionRow, ConnectionGroups } from '../../features/network/ui/NetworkPeekModals'
import { HeroGraph } from './HeroGraph'
import styles from './NetworkHero.module.css'

type Props = {
  onOpenConnections: (groups: ConnectionGroups) => void
  audience?: 'user' | 'company'
}

const FILTERS: { v: GraphFilter; l: string }[] = [
  { v: 'all', l: 'Все' },
  { v: 'people', l: 'Люди' },
  { v: 'companies', l: 'Компании' },
]

const R = 100
const C = 2 * Math.PI * R
const GAP = 6

function nodeToRow(n: GraphNodeData): CompositionRow {
  return {
    id: n.id,
    name: n.name,
    sub: n.sub,
    avatar: n.avatar,
    initial: n.initial,
    square: n.kind === 'company',
  }
}

export function NetworkHero({ onOpenConnections, audience = 'user' }: Props) {
  const isCompany = audience === 'company'
  const navigate = useNavigate()
  const myId = useAppSelector((s) => s.auth.user?.id)
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const followers = useAppSelector((s) => s.network.followers)
  const [nodes, setNodes] = useState<GraphNodeData[]>([])
  const [filter, setFilter] = useState<GraphFilter>('all')

  const onNodes = useCallback((ns: GraphNodeData[]) => setNodes(ns), [])

  // Состав сети для «Мои связи» — только ПРЯМЫЕ связи (degree 1). Вторичные (degree 2)
  // рисуются на графе блёклым цветом, но в счётчик/списки связей не попадают.
  // Исходящие = на кого подписан я, входящие = кто подписан на меня (из стора,
  // чтобы взаимные попали в обе вкладки).
  const comp = useMemo(() => {
    const direct = nodes.filter((n) => n.degree === 1)
    const followingSet = new Set(followingIds)
    const followerSet = new Set(followers.map((f) => f.id))
    return {
      first: direct,
      people: direct.filter((n) => n.kind === 'person'),
      companies: direct.filter((n) => n.kind === 'company'),
      outgoing: direct.filter((n) => followingSet.has(n.id)),
      incoming: direct.filter((n) => followerSet.has(n.id)),
      total: direct.length,
    }
  }, [nodes, followingIds, followers])

  // Клик по узлу графа → переход в профиль (свой → /profile, чужой → /u/:id),
  // с разметкой источника для аналитики (record_profile_view → from=network).
  const goToProfile = useCallback(
    (node: GraphNodeData) => {
      if (myId && node.id === myId) navigate('/profile')
      else navigate(`/u/${node.id}?from=network`)
    },
    [navigate, myId],
  )

  function openConnections() {
    onOpenConnections({
      all: comp.first.map(nodeToRow),
      people: comp.people.map(nodeToRow),
      companies: comp.companies.map(nodeToRow),
      outgoing: comp.outgoing.map(nodeToRow),
      incoming: comp.incoming.map(nodeToRow),
    })
  }

  const total = comp.total
  // Только прямые связи → одно кольцо во всю окружность (с небольшим разрывом).
  const seg1 = total ? C : 0

  return (
    <section className={styles.hero}>
      <div className={styles.heroLeft}>
        <div className={styles.eyebrow}>{isCompany ? 'Состав сети компании' : 'Состав твоей сети'}</div>
        <h1 className={styles.heroTitle}>Кто стоит за каждой связью</h1>

        <div className={styles.donut} aria-label={`Всего ${total}`}>
          <svg viewBox="0 0 240 240">
            <circle cx="120" cy="120" r={R} className={styles.ringBg} />
            <circle
              cx="120"
              cy="120"
              r={R}
              className={styles.ringSeg}
              stroke="#ff7f50"
              strokeDasharray={`${Math.max(seg1 - GAP, 0)} ${C - Math.max(seg1 - GAP, 0)}`}
              strokeDashoffset={0}
            />
          </svg>
          <div className={styles.donutCenter}>
            <div className={styles.donutN}>{total}</div>
            <div className={styles.donutL}>человек и компаний</div>
          </div>
        </div>

        <div className={styles.legend}>
          <button className={styles.connBtn} onClick={openConnections}>
            <span className={styles.connBtnLab}>Мои связи</span>
            <span className={styles.connBtnVal}>{total}</span>
          </button>
        </div>
      </div>

      <div className={styles.heroGraph}>
        <HeroGraph filter={filter} onNodes={onNodes} onNodeClick={goToProfile} />

        <div className={styles.graphFilters}>
          {FILTERS.map((f) => (
            <button
              key={f.v}
              className={[styles.gFilter, filter === f.v ? styles.gFilterOn : ''].join(' ')}
              onClick={() => setFilter(f.v)}
            >
              {f.l}
            </button>
          ))}
        </div>

        <div className={styles.graphTip}>
          <span>Нажми на узел — откроется профиль</span>
          <span className={styles.tipLegend}>
            <span>
              <i className={styles.tipDot} style={{ background: '#ff7f50' }} />пользователи
            </span>
            <span>
              <i className={[styles.tipDot, styles.tipDotSq].join(' ')} style={{ background: '#ff7f50' }} />
              компании
            </span>
          </span>
        </div>
      </div>
    </section>
  )
}
