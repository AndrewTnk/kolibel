import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchConnectionsGraph,
  type ConnectionsGraph,
  type GraphNodeData,
} from '../../features/network/lib/connectionsGraph'
import {
  RelationGraph,
  DEFAULT_GRAPH_COLORS,
  type GraphColors,
  type GraphFilter,
} from '../../features/network/ui/RelationGraph'
import { BlockSkeleton } from '../../shared/ui/Skeleton/Skeleton'
import styles from './NetworkHero.module.css'

const COLORS_KEY = 'kolibel:graphColors'

function loadColors(): GraphColors {
  try {
    const raw = localStorage.getItem(COLORS_KEY)
    if (raw) return { ...DEFAULT_GRAPH_COLORS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULT_GRAPH_COLORS
}

/** Предзагрузка аватаров, чтобы canvas рисовал их сразу. */
function preloadImages(urls: string[], cache: Map<string, HTMLImageElement>): Promise<void> {
  const pending = urls.filter((u) => u && !cache.has(u))
  return Promise.all(
    pending.map(
      (u) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          const done = () => resolve()
          img.onload = done
          img.onerror = done
          setTimeout(done, 4000)
          img.src = u
          cache.set(u, img)
        }),
    ),
  ).then(() => undefined)
}

/** Измеряет контейнер через callback-ref (работает и для тела модалки). */
function useBoxSize(fallbackH: number) {
  const [size, setSize] = useState({ w: 0, h: fallbackH })
  const obsRef = useRef<ResizeObserver | null>(null)
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      obsRef.current?.disconnect()
      obsRef.current = null
      if (!el) return
      const update = () => setSize({ w: el.clientWidth, h: el.clientHeight || fallbackH })
      update()
      const ro = new ResizeObserver(update)
      ro.observe(el)
      obsRef.current = ro
    },
    [fallbackH],
  )
  return { ref, size }
}

type Props = {
  filter: GraphFilter
  /** Узлы графа (degree>0 — связи) для donut и списков состава сети. */
  onNodes: (nodes: GraphNodeData[]) => void
  onNodeClick: (node: GraphNodeData) => void
}

/** Граф связей в Hero: переиспользует движок RelationGraph, фильтр — снаружи,
 *  клик по узлу ведёт в профиль (`onNodeClick`), есть кнопка «развернуть» в полноэкранную модалку. */
export function HeroGraph({ filter, onNodes, onNodeClick }: Props) {
  const [data, setData] = useState<ConnectionsGraph | null>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [colors, setColors] = useState<GraphColors>(loadColors)
  const cacheRef = useRef<Map<string, HTMLImageElement>>(new Map())

  const box = useBoxSize(360)
  const modal = useBoxSize(620)

  useEffect(() => {
    let alive = true
    setReady(false)
    setData(null)
    fetchConnectionsGraph()
      .then(async (g) => {
        if (!alive) return
        await preloadImages(
          g.nodes.map((n) => n.avatar).filter((u): u is string => !!u),
          cacheRef.current,
        )
        if (!alive) return
        setData(g)
        setReady(true)
        onNodes(g.nodes)
      })
      .catch(() => {
        if (alive) {
          setData({ nodes: [], edges: [] })
          setReady(true)
        }
      })
    return () => {
      alive = false
    }
    // onNodes стабилен у родителя (useCallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function updateColors(next: GraphColors) {
    setColors(next)
    try {
      localStorage.setItem(COLORS_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  const empty = ready && data && data.nodes.length <= 1

  return (
    <>
      <div ref={box.ref} className={styles.graphCanvasBox}>
        {!ready ? (
          <BlockSkeleton height={360} />
        ) : empty ? (
          <div className={styles.graphEmpty}>
            Пока нет связей. Подпишись на людей и компании — и тут вырастет твой граф.
          </div>
        ) : data && box.size.w > 0 ? (
          <RelationGraph
            data={data}
            images={cacheRef.current}
            width={box.size.w}
            height={box.size.h}
            colors={colors}
            filter={filter}
            onNodeClick={onNodeClick}
          />
        ) : null}
      </div>

      {data && data.nodes.length > 1 ? (
        <button
          type="button"
          className={styles.graphExpand}
          aria-label="Развернуть граф"
          onClick={() => setOpen(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}

      {open && data
        ? createPortal(
            <div
              className={styles.graphOverlay}
              onClick={() => setOpen(false)}
              role="dialog"
              aria-modal
              aria-label="Карта твоей сети"
            >
              <div className={styles.graphModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.graphModalHead}>
                  <div>
                    <div className={styles.graphModalTitle}>Карта твоей сети</div>
                    <div className={styles.graphModalSub}>Нажми на узел — откроется профиль</div>
                  </div>
                  <button
                    type="button"
                    className={styles.graphModalClose}
                    aria-label="Закрыть"
                    onClick={() => setOpen(false)}
                  >
                    ✕
                  </button>
                </div>
                <div ref={modal.ref} className={styles.graphModalBody}>
                  {modal.size.w > 0 ? (
                    <RelationGraph
                      data={data}
                      images={cacheRef.current}
                      width={modal.size.w}
                      height={modal.size.h}
                      colors={colors}
                      showSettings
                      expanded
                      onColorsChange={updateColors}
                      onNodeClick={onNodeClick}
                    />
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
