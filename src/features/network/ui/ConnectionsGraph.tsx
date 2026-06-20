import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { loadNetwork } from '../model/networkThunks'
import { fetchConnectionsGraph, type ConnectionsGraph as GraphData } from '../lib/connectionsGraph'
import { BlockSkeleton } from '../../../shared/ui/Skeleton/Skeleton'
import { RelationGraph, DEFAULT_GRAPH_COLORS, type GraphColors } from './RelationGraph'
import { NetworkStats } from './NetworkStats'
import { NetworkListModal, type NetworkListKind, type NetworkListItem } from './NetworkListModal'
import styles from './ConnectionsGraph.module.css'

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

/** Предзагрузка аватаров в кэш Image, чтобы canvas рисовал их сразу (без «мигания»). */
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
          setTimeout(done, 4000) // не ждём вечно
          img.src = u
          cache.set(u, img)
        }),
    ),
  ).then(() => undefined)
}

/** Измеряет размер контейнера через callback-ref (срабатывает и для элементов,
 *  появляющихся позже — например, тела модалки при открытии). */
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

export function ConnectionsGraph({
  withStats = false,
  rootId,
  title = 'Моя сеть',
  forceOpen = false,
  onForceClose,
}: {
  withStats?: boolean
  /** Если задан — граф строится вокруг этого профиля (чужой профиль), иначе вокруг меня. */
  rootId?: string
  title?: string
  /** Внешнее открытие модалки графа (напр. иконка в хедере на мобилке). */
  forceOpen?: boolean
  /** Вызывается при закрытии модалки, открытой через forceOpen. */
  onForceClose?: () => void
}) {
  const dispatch = useAppDispatch()
  const isPublic = !!rootId
  const [data, setData] = useState<GraphData | null>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const isOpen = open || forceOpen
  const closeModal = () => {
    setOpen(false)
    if (forceOpen) onForceClose?.()
  }
  const [statModal, setStatModal] = useState<NetworkListKind | null>(null)
  const [colors, setColors] = useState<GraphColors>(loadColors)
  const cacheRef = useRef<Map<string, HTMLImageElement>>(new Map())

  // Счётчики моей сети (для своего профиля)
  const myFollowingPeople = useAppSelector((s) => s.network.followingPeople.length)
  const myFollowingCompanies = useAppSelector((s) => s.network.followingCompanies.length)
  const myFollowers = useAppSelector((s) => s.network.followers.length)
  const networkStatus = useAppSelector((s) => s.network.status)
  // id текущего аккаунта — чтобы перестроить «свой» граф при смене аккаунта (rootId не меняется).
  const myId = useAppSelector((s) => s.auth.user?.id)
  useEffect(() => {
    if (withStats && !isPublic && networkStatus === 'idle') void dispatch(loadNetwork())
  }, [withStats, isPublic, networkStatus, dispatch])

  // Для чужого профиля счётчики и списки берём прямо из данных графа (degree 1)
  const directNodes = data?.nodes.filter((n) => n.degree === 1) ?? []
  const pubFollowing = directNodes.filter((n) => n.relation === 'following')
  const pubFollowers = directNodes.filter((n) => n.relation === 'follower')

  const followingPeople = isPublic ? pubFollowing.length : myFollowingPeople
  const followingCompanies = isPublic ? 0 : myFollowingCompanies
  const followers = isPublic ? pubFollowers.length : myFollowers

  function publicItems(kind: NetworkListKind): NetworkListItem[] {
    const src = kind === 'followers' ? pubFollowers : pubFollowing
    return src.map((n) => ({
      id: n.id,
      name: n.name,
      sub: n.sub,
      avatar: n.avatar,
      initial: n.initial,
      square: n.kind === 'company',
    }))
  }

  function updateColors(next: GraphColors) {
    setColors(next)
    try {
      localStorage.setItem(COLORS_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  const small = useBoxSize(180)
  const modal = useBoxSize(600)

  useEffect(() => {
    let alive = true
    setReady(false)
    setData(null)
    fetchConnectionsGraph(rootId)
      .then(async (g) => {
        if (!alive) return
        await preloadImages(
          g.nodes.map((n) => n.avatar).filter((u): u is string => !!u),
          cacheRef.current,
        )
        if (!alive) return
        setData(g)
        setReady(true)
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
    // myId — чтобы «свой» граф (rootId === undefined) перестроился при смене аккаунта.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootId, myId])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const empty = ready && data && data.nodes.length <= 1

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.title}>{title}</div>
        {data && data.nodes.length > 1 ? (
          <button
            type="button"
            className={styles.expandBtn}
            aria-label="Развернуть граф"
            onClick={() => setOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 18 18 6M18 6h-5M18 6v5M6 18h5M6 18v-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      <div ref={small.ref} className={styles.box}>
        {!ready ? (
          <BlockSkeleton height={180} />
        ) : empty ? (
          <div className={styles.empty}>Пока нет связей. Подпишитесь на людей и компании.</div>
        ) : data && small.size.w > 0 ? (
          <RelationGraph
            data={data}
            images={cacheRef.current}
            width={small.size.w}
            height={180}
            colors={colors}
          />
        ) : null}
      </div>

      {withStats ? (
        <div className={styles.statsSection}>
          <NetworkStats
            embedded
            onOpen={(kind) => setStatModal(kind)}
            followingPeople={followingPeople}
            followingCompanies={followingCompanies}
            followers={followers}
          />
        </div>
      ) : null}

      {statModal ? (
        <NetworkListModal
          kind={statModal}
          onClose={() => setStatModal(null)}
          items={isPublic ? publicItems(statModal) : undefined}
        />
      ) : null}

      {isOpen && data
        ? createPortal(
            <div className={styles.overlay} onClick={closeModal} role="dialog" aria-modal aria-label={title}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHead}>
                  <div className={styles.modalTitle}>{title}</div>
                  <button type="button" className={styles.close} aria-label="Закрыть" onClick={closeModal}>
                    ✕
                  </button>
                </div>
                <div ref={modal.ref} className={styles.modalBody}>
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
                    />
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
