import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../app/store/hooks'
import type { GraphNodeData } from '../../features/network/lib/connectionsGraph'
import type { GraphFilter } from '../../features/network/ui/RelationGraph'
import type { CompositionRow } from '../../features/network/ui/NetworkPeekModals'
import { HeroGraph } from './HeroGraph'
import styles from './NetworkHero.module.css'

type Props = {
  onOpenList: (title: string, subtitle: string, rows: CompositionRow[]) => void
  audience?: 'user' | 'company'
}

const FILTERS: { v: GraphFilter; l: string }[] = [
  { v: 'all', l: 'Все' },
  { v: 'first', l: '1-й' },
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

export function NetworkHero({ onOpenList, audience = 'user' }: Props) {
  const isCompany = audience === 'company'
  const navigate = useNavigate()
  const myId = useAppSelector((s) => s.auth.user?.id)
  const [nodes, setNodes] = useState<GraphNodeData[]>([])
  const [filter, setFilter] = useState<GraphFilter>('all')

  const onNodes = useCallback((ns: GraphNodeData[]) => setNodes(ns), [])

  // Состав сети из графа (degree>0 — это связи).
  const comp = useMemo(() => {
    const links = nodes.filter((n) => n.degree > 0)
    const first = links.filter((n) => n.degree === 1)
    const second = links.filter((n) => n.degree === 2)
    return {
      first,
      second,
      people: links.filter((n) => n.kind === 'person'),
      companies: links.filter((n) => n.kind === 'company'),
      total: links.length,
    }
  }, [nodes])

  // Клик по узлу графа → переход в профиль (свой → /profile, чужой → /u/:id),
  // с разметкой источника для аналитики (record_profile_view → from=network).
  const goToProfile = useCallback(
    (node: GraphNodeData) => {
      if (myId && node.id === myId) navigate('/profile')
      else navigate(`/u/${node.id}?from=network`)
    },
    [navigate, myId],
  )

  function openList(kind: 'first' | 'second' | 'people' | 'companies') {
    const map = {
      first: { src: comp.first, title: '1-й круг', sub: 'Прямые связи' },
      second: { src: comp.second, title: '2-й круг', sub: 'Через знакомых' },
      people: { src: comp.people, title: isCompany ? 'Люди в сети компании' : 'Люди в твоей сети', sub: 'Все люди' },
      companies: { src: comp.companies, title: isCompany ? 'Компании в сети' : 'Компании в твоей сети', sub: 'Все компании' },
    }[kind]
    onOpenList(map.title, `${map.src.length} в списке`, map.src.map(nodeToRow))
  }

  const total = comp.total
  const seg1 = total ? (C * comp.first.length) / total : 0
  const seg2 = total ? (C * comp.second.length) / total : 0

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
            <circle
              cx="120"
              cy="120"
              r={R}
              className={styles.ringSeg}
              stroke="#f3b89e"
              strokeDasharray={`${Math.max(seg2 - GAP, 0)} ${C - Math.max(seg2 - GAP, 0)}`}
              strokeDashoffset={-seg1}
            />
          </svg>
          <div className={styles.donutCenter}>
            <div className={styles.donutN}>{total}</div>
            <div className={styles.donutL}>человек и компаний</div>
          </div>
        </div>

        <div className={styles.legend}>
          <button className={styles.legendItem} onClick={() => openList('first')}>
            <div className={styles.legendLab}>
              <span className={styles.swatch} style={{ background: '#ff7f50' }} />1-й круг
            </div>
            <div className={styles.legendVal}>{comp.first.length}</div>
          </button>
          <button className={styles.legendItem} onClick={() => openList('second')}>
            <div className={styles.legendLab}>
              <span className={styles.swatch} style={{ background: '#f3b89e' }} />2-й круг
            </div>
            <div className={styles.legendVal}>{comp.second.length}</div>
          </button>
          <button className={styles.legendItem} onClick={() => openList('people')}>
            <div className={styles.legendLab}>
              <span className={styles.swatch} style={{ background: '#111827' }} />Люди
            </div>
            <div className={styles.legendVal}>{comp.people.length}</div>
          </button>
          <button className={styles.legendItem} onClick={() => openList('companies')}>
            <div className={styles.legendLab}>
              <span className={[styles.swatch, styles.swatchSq].join(' ')} style={{ background: '#ff7f50' }} />
              Компании
            </div>
            <div className={styles.legendVal}>{comp.companies.length}</div>
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
              <i className={styles.tipDot} style={{ background: '#ff7f50' }} />1-й
            </span>
            <span>
              <i className={styles.tipDot} style={{ background: '#f3b89e' }} />2-й
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
