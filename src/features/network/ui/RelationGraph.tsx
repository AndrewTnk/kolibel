import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../../app/store/hooks'
import type { ConnectionsGraph, GraphNodeData } from '../lib/connectionsGraph'
import styles from './RelationGraph.module.css'

type FGNode = GraphNodeData & { x?: number; y?: number }

/** Настраиваемые цвета узлов по типу связи. */
export type GraphColors = { following: string; follower: string }
export const DEFAULT_GRAPH_COLORS: GraphColors = { following: '#ff7f50', follower: '#ff7f50' }

// Фиксированные цвета
const COLORS = {
  me: '#ff7f50', // коралл — это вы (центр)
  second: '#f3b89e', // второй уровень — приглушённый коралл
  directLink: 'rgba(61, 71, 86, 0.6)', // тёмные линии
  secondLink: 'rgba(110, 119, 133, 0.55)', // вторичные — тоже заметные
  linkHi: '#ff7f50', // подсвеченная связь при наведении
  linkDim: 'rgba(110, 119, 133, 0.1)', // приглушённая связь (не связана с наведённым)
} as const

function nodeId(x: unknown): string {
  return typeof x === 'object' && x !== null ? (x as { id: string }).id : (x as string)
}
function linkKeyOf(l: { source: unknown; target: unknown }): string {
  return [nodeId(l.source), nodeId(l.target)].sort().join('|')
}

function radiusFor(degree: 0 | 1 | 2): number {
  // Узлы первого уровня немного меньше (−15%), чтобы у центра не было «каши».
  return degree === 0 ? 9 : degree === 1 ? 5.1 : 4
}
function colorFor(node: FGNode, colors: GraphColors): string {
  if (node.degree === 0) return COLORS.me
  if (node.degree === 2) return COLORS.second
  return node.relation === 'follower' ? colors.follower : colors.following
}

/** Подпись типа связи для тултипа (как в макете). */
function tipNote(node: FGNode): string {
  if (node.degree === 0) return 'это вы'
  if (node.degree === 2) return 'через связь 1-го круга'
  if (node.relation === 'follower') return 'подписан на вас'
  if (node.relation === 'following') return 'вы подписаны'
  return 'прямая связь'
}

function shapePath(ctx: CanvasRenderingContext2D, node: FGNode, x: number, y: number, r: number) {
  ctx.beginPath()
  if (node.kind === 'company') {
    const rad = r * 0.35
    // скруглённый квадрат (как лого компании)
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x - r, y - r, r * 2, r * 2, rad)
    else ctx.rect(x - r, y - r, r * 2, r * 2)
  } else {
    ctx.arc(x, y, r, 0, 2 * Math.PI)
  }
  ctx.closePath()
}

type Props = {
  data: ConnectionsGraph
  images: Map<string, HTMLImageElement>
  width: number
  height: number
  colors: GraphColors
  /** Показывать кнопку/панель настроек графа (в развёрнутом окне). */
  showSettings?: boolean
  onColorsChange?: (colors: GraphColors) => void
  /** Развёрнутый режim (модалка): фильтры, легенда, подсказка с типом связи. */
  expanded?: boolean
  /** Управляемый извне фильтр (Hero рисует свои кнопки фильтров). */
  filter?: GraphFilter
  /** Клик по узлу — вместо навигации на /u/:id (напр. открыть peek-модалку). */
  onNodeClick?: (node: GraphNodeData) => void
}

export type GraphFilter = 'all' | 'people' | 'companies'

const FILTERS: { key: GraphFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'people', label: 'Люди' },
  { key: 'companies', label: 'Компании' },
]

export function RelationGraph({
  data,
  images,
  width,
  height,
  colors,
  showSettings = false,
  onColorsChange,
  expanded = false,
  filter: controlledFilter,
  onNodeClick,
}: Props) {
  const navigate = useNavigate()
  const me = useAppSelector((s) => s.auth.user?.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [internalFilter, setFilter] = useState<GraphFilter>('all')
  const filter = controlledFilter ?? internalFilter
  const [hover, setHover] = useState<FGNode | null>(null)
  const hoverRef = useRef<FGNode | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  // Базовый зум после авто-вписывания: подписи/аватары проявляются при приближении
  // относительно него (а не по абсолютному масштабу — он зависит от размера графа).
  const baseZoomRef = useRef<number | null>(null)
  // Авто-вписывание выполняем один раз (иначе вид «прыгает» после перетаскивания узла)
  const fittedRef = useRef(false)
  // Подсветка при наведении: id подсвеченных узлов и ключи подсвеченных рёбер
  const hlRef = useRef<{ nodes: Set<string>; links: Set<string> }>({
    nodes: new Set(),
    links: new Set(),
  })

  // Стабильная копия данных для симуляции (force-graph мутирует объекты) + фильтр.
  const graphData = useMemo(() => {
    let nodes = data.nodes
    if (filter === 'people') nodes = nodes.filter((n) => n.degree === 0 || n.kind === 'person')
    else if (filter === 'companies') nodes = nodes.filter((n) => n.degree === 0 || n.kind === 'company')
    const ids = new Set(nodes.map((n) => n.id))
    const links = data.edges.filter((e) => ids.has(e.source) && ids.has(e.target))
    return { nodes: nodes.map((n) => ({ ...n })), links: links.map((e) => ({ ...e })) }
  }, [data, filter])

  // При смене фильтра — пере-вписать граф (сбросить авто-fit и базовый зум).
  useEffect(() => {
    fittedRef.current = false
    baseZoomRef.current = null
  }, [filter])

  // Разносим узлы: сильнее отталкивание + прямые связи дальше от центра,
  // связи второго уровня жмутся к своему «родителю». Меньше «каши».
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    fg.d3Force('charge')?.strength(-150)
    const link = fg.d3Force('link')
    if (link) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      link.distance((l: any) => (l.degree === 2 ? 26 : 82)).strength(0.65)
    }
    fg.d3ReheatSimulation?.()
  }, [graphData])

  // Позиционируем тултип у наведённого узла каждый кадр (следует за зумом/симуляцией)
  function positionTip() {
    const node = hoverRef.current
    const tip = tipRef.current
    const fg = fgRef.current
    if (!node || !tip || !fg || node.x == null || node.y == null) return
    const { x, y } = fg.graph2ScreenCoords(node.x, node.y)
    tip.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - 14}px)`
  }

  useEffect(() => {
    hoverRef.current = hover
    positionTip()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover])

  return (
    <div className={styles.wrap} style={{ width, height }}>
      <ForceGraph2D
        ref={fgRef}
        width={width}
        height={height}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={120}
        onEngineStop={() => {
          const fg = fgRef.current
          if (!fg || fittedRef.current) return
          fittedRef.current = true
          // Стартовое положение «ближе» — небольшой отступ, чтобы граф выглядел крупнее.
          fg.zoomToFit?.(500, Math.max(8, Math.round(height * 0.06)))
          window.setTimeout(() => {
            baseZoomRef.current = fg.zoom?.() ?? null
          }, 560)
        }}
        nodeRelSize={6}
        nodeLabel={() => ''}
        linkColor={(l: { degree?: number; source: unknown; target: unknown }) => {
          const hl = hlRef.current
          if (hl.links.size === 0) return l.degree === 2 ? COLORS.secondLink : COLORS.directLink
          return hl.links.has(linkKeyOf(l)) ? COLORS.linkHi : COLORS.linkDim
        }}
        linkWidth={(l: { degree?: number; source: unknown; target: unknown }) => {
          const hl = hlRef.current
          const base = l.degree === 2 ? 0.7 : 1.1
          if (hl.links.size === 0) return base
          return hl.links.has(linkKeyOf(l)) ? 1.8 : base
        }}
        enableNodeDrag
        onRenderFramePost={() => positionTip()}
        onNodeHover={(node: FGNode | null) => {
          setHover(node)
          const nodes = new Set<string>()
          const links = new Set<string>()
          if (node) {
            nodes.add(node.id)
            for (const e of data.edges) {
              if (e.source === node.id || e.target === node.id) {
                nodes.add(e.source)
                nodes.add(e.target)
                links.add([e.source, e.target].sort().join('|'))
              }
            }
          }
          hlRef.current = { nodes, links }
          const cv = fgRef.current?.canvas?.()
          if (cv) cv.style.cursor = node ? 'pointer' : 'default'
        }}
        onNodeClick={(node: FGNode) => {
          if (!node) return
          if (onNodeClick) {
            onNodeClick(node)
            return
          }
          if (node.id === me) navigate('/profile')
          else navigate(`/u/${node.id}`)
        }}
        nodePointerAreaPaint={(node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
          const r = radiusFor(node.degree)
          ctx.fillStyle = color
          shapePath(ctx, node, node.x ?? 0, node.y ?? 0, r)
          ctx.fill()
        }}
        nodeCanvasObject={(node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const x = node.x ?? 0
          const y = node.y ?? 0
          const r = radiusFor(node.degree)
          const img = node.avatar ? images.get(node.avatar) : undefined
          const imgReady = !!img && img.complete && img.naturalWidth > 0

          // При наведении приглушаем узлы, не связанные с наведённым
          const hl = hlRef.current
          const active = hl.nodes.size > 0
          const nodeAlpha = active && !hl.nodes.has(node.id) ? 0.15 : 1

          // Зум относительно стартового: аватар плавно проявляется при приближении
          // и затухает при отдалении. Текстовые подписи узлов НЕ показываем (по ТЗ).
          const base = baseZoomRef.current
          const ratio = base ? globalScale / base : 0
          const avatarAlpha = imgReady
            ? Math.max(0, Math.min(1, (ratio - 1.1) / (1.9 - 1.1)))
            : 0

          // базовая заливка цветом + плавный кроссфейд в аватар поверх неё
          ctx.save()
          ctx.globalAlpha = nodeAlpha
          shapePath(ctx, node, x, y, r)
          ctx.fillStyle = colorFor(node, colors)
          ctx.fill()
          if (avatarAlpha > 0.01 && img) {
            ctx.clip()
            ctx.globalAlpha = nodeAlpha * avatarAlpha
            ctx.drawImage(img, x - r, y - r, r * 2, r * 2)
          }
          ctx.restore()
        }}
      />

      {hover ? (
        <div ref={tipRef} className={styles.tip}>
          <div className={styles.tipAvatar} data-square={hover.kind === 'company'}>
            {hover.avatar ? (
              <img src={hover.avatar} alt="" />
            ) : (
              <span>{hover.initial}</span>
            )}
          </div>
          <div className={styles.tipMeta}>
            <div className={styles.tipName}>{hover.name}</div>
            <div className={styles.tipSub}>{hover.sub}</div>
            {tipNote(hover) ? <div className={styles.tipNote}>{tipNote(hover)}</div> : null}
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={[styles.filter, filter === f.key ? styles.filterOn : ''].join(' ')}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {expanded ? (
        <div className={styles.legend}>
          <span>
            <i style={{ background: COLORS.me }} />Пользователи
          </span>
          <span>
            <i className={styles.legendSq} style={{ background: COLORS.me }} />Компании
          </span>
        </div>
      ) : null}

      {showSettings ? (
        <div className={styles.settings}>
          <button
            type="button"
            className={styles.gear}
            aria-label="Настройки графа"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {settingsOpen ? (
            <div className={styles.panel}>
              <div className={styles.panelTitle}>Цвета связей</div>
              <label className={styles.row}>
                <input
                  type="color"
                  value={colors.following}
                  onChange={(e) => onColorsChange?.({ ...colors, following: e.target.value })}
                />
                <span>Подписки</span>
              </label>
              <label className={styles.row}>
                <input
                  type="color"
                  value={colors.follower}
                  onChange={(e) => onColorsChange?.({ ...colors, follower: e.target.value })}
                />
                <span>Подписчики</span>
              </label>
              <button
                type="button"
                className={styles.reset}
                onClick={() => onColorsChange?.({ ...DEFAULT_GRAPH_COLORS })}
              >
                Сбросить
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
