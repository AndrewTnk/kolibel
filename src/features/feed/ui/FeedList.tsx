import { useEffect, useMemo, useRef, useState, Fragment } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { useIsMobile } from '../../../shared/lib/useMediaQuery'
import { loadFeed } from '../model/feedThunks'
import type { FeedPost } from '../model/types'
import { rankFeed, type RankContext } from '../lib/rankFeed'
import type { FeedSortMode } from '../lib/feedSort'
import { PostCard } from './PostCard'
import { FeedSkeleton } from './FeedSkeleton'
import { RecommendedPeople } from '../../../shared/ui/Recommendations/RecommendedPeople'
import { RecommendedVacancies } from '../../../shared/ui/Recommendations/RecommendedVacancies'
import { RecommendedCompanies } from '../../../shared/ui/Recommendations/RecommendedCompanies'
import styles from './Feed.module.css'

/** Карусели рекомендаций, чередуемые между постами на мобильных. */
const recCarousels = [
  <RecommendedPeople horizontal />,
  <RecommendedVacancies horizontal />,
  <RecommendedCompanies horizontal />,
]
/** Разрыв между рекомендациями в ленте (постов): не чаще каждых MIN, не реже MAX. */
const REC_MIN_GAP = 5
const REC_MAX_GAP = 10
/** Сколько постов рендерим в DOM за раз (следующая порция — по скроллу вниз). */
const PAGE_SIZE = 20

/** Детерминированный ГПСЧ (mulberry32) — стабильная раскладка рекомендаций в рамках визита. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function FeedList({
  intersperse = false,
  authorId,
  ranked = false,
  recSlots,
  focusPostId,
  sortMode = 'recommended',
}: {
  intersperse?: boolean
  /** Показать только посты этого автора (режим профиля). */
  authorId?: string
  /** Ранжировать единым score + разнообразие (общая лента на главной). */
  ranked?: boolean
  /** Чем чередовать ленту на мобилке (по умолчанию — пользовательские рекомендации).
   *  Страница задаёт сама, чтобы не тянуть widgets в feature (FSD). */
  recSlots?: React.ReactNode[]
  /** Прокрутить к этому посту и подсветить (якорь из уведомлений: /?post=:id). */
  focusPostId?: string
  /** Режим сортировки общей ленты (актуально только при `ranked`). */
  sortMode?: FeedSortMode
}) {
  const dispatch = useAppDispatch()
  const allPosts = useAppSelector((s) => s.feed.posts)
  const justPostedIds = useAppSelector((s) => s.feed.justPostedIds)
  const feedVersion = useAppSelector((s) => s.feed.feedVersion)
  const myId = useAppSelector((s) => s.auth.user?.id)
  const loaded = useAppSelector((s) => s.feed.loaded)
  const isMobile = useIsMobile()
  // Seed раскладки рекомендаций — фиксируется на визит (новый при перемонтировании).
  const [recSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff))

  // Сигналы для ранжирования (берём из стора; если пусто — ранжирование мягко деградирует).
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const accountType = useAppSelector((s) => s.account.type)
  const mySkills = useAppSelector((s) => s.profile.resume.skills)
  const myJobTitle = useAppSelector((s) => s.profile.resume.jobTitle)
  const companyIndustry = useAppSelector((s) => s.company.profile.industry)
  const companyDirections = useAppSelector((s) => s.company.profile.directions)

  // Готовность сигналов ранжирования: сеть (подписки) и интересы (профиль/компания)
  // грузятся параллельно с лентой. Пока они не готовы — ранжированную ленту НЕ
  // показываем, иначе посты отрисуются в «неполном» порядке и через секунду
  // пересортируются (видимый прыжок). Профиль (authorId) сигналов не требует.
  const networkStatus = useAppSelector((s) => s.network.status)
  const profileLoaded = useAppSelector((s) => s.profile.loaded)
  const companyLoaded = useAppSelector((s) => s.company.loaded)
  const interestsReady = accountType === 'company' ? companyLoaded : profileLoaded
  const networkSettled = networkStatus === 'ready' || networkStatus === 'error'
  const signalsReady = networkSettled && interestsReady

  // Перезагружаем ленту при смене аккаунта: resetStores чистит стор, но компонент
  // может не перемонтироваться (остаёмся на «/») — поэтому завязываемся на myId.
  useEffect(() => {
    void dispatch(loadFeed())
  }, [dispatch, myId])

  // Гейт показа ранжированной ленты: открывается, когда сигналы готовы, либо по
  // таймауту-подстраховке (чтобы скелетон не висел вечно при медленной сети).
  // Открывшись — больше не закрывается (повторная загрузка сети не вернёт скелетон).
  const [rankGateOpen, setRankGateOpen] = useState(!ranked)
  useEffect(() => {
    if (!ranked || signalsReady) {
      setRankGateOpen(true)
      return
    }
    const t = window.setTimeout(() => setRankGateOpen(true), 1500)
    return () => window.clearTimeout(t)
  }, [ranked, signalsReady])

  // Мои интересы: у компании — индустрия + направления; у человека — навыки + должность.
  const myInterests = useMemo(() => {
    const tokens =
      accountType === 'company'
        ? [companyIndustry, ...companyDirections.map((d) => d.title)]
        : [...mySkills, myJobTitle]
    return new Set(tokens.filter(Boolean).map((t) => t.trim().toLowerCase()))
  }, [accountType, companyIndustry, companyDirections, mySkills, myJobTitle])

  // Замороженный порядок ранжированной ленты — список id. Пересчитывается ТОЛЬКО при
  // смене freezeKey: явная перезагрузка ленты (feedVersion), открытие гейта (сигналы
  // готовы) или смена контекста (аккаунт). НЕ зависит от лайков/комментов → пост не
  // «прыгает» при лайке, позиция меняется только после перезагрузки ленты/страницы.
  const freezeKey = `${myId ?? ''}|${feedVersion}|${rankGateOpen ? 'open' : 'wait'}`
  const frozenIds = useMemo(() => {
    if (!ranked) return [] as string[]
    const ctx: RankContext = { myId, followingIds: new Set(followingIds), myInterests }
    return rankFeed(allPosts, ctx).map((p) => p.id)
    // Намеренно зависим ТОЛЬКО от freezeKey (порядок замораживаем); allPosts/сигналы
    // читаются на момент пересчёта.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freezeKey])

  const posts = useMemo(() => {
    // Профиль — только посты автора, живая хронология (без алгоритма/заморозки).
    if (!ranked) {
      return authorId ? allPosts.filter((p) => p.authorId === authorId) : allPosts
    }
    // Альтернативные режимы сортировки — живой пересчёт (без заморозки).
    if (sortMode === 'connections') {
      const set = new Set(followingIds)
      return allPosts.filter((p) => set.has(p.authorId)).sort((a, b) => b.createdAt - a.createdAt)
    }
    if (sortMode === 'new') {
      return [...allPosts].sort((a, b) => b.createdAt - a.createdAt)
    }
    if (sortMode === 'popular') {
      const eng = (p: FeedPost) => p.likesCount + 2 * p.comments.length
      return [...allPosts].sort((a, b) => eng(b) - eng(a) || b.createdAt - a.createdAt)
    }
    // Рекомендованные: материализуем замороженный порядок живыми объектами.
    // Контент (лайки/комменты) — актуальный, позиция — стабильная.
    const byId = new Map(allPosts.map((p) => [p.id, p]))
    const seen = new Set<string>()
    const out: FeedPost[] = []
    const push = (p: FeedPost | undefined) => {
      if (p && !seen.has(p.id)) {
        out.push(p)
        seen.add(p.id)
      }
    }
    // 1. Свои только что опубликованные посты — закрепляем вверху (до перезагрузки).
    for (const id of justPostedIds) push(byId.get(id))
    // 2. Замороженный порядок (удалённые посты выпадают сами).
    for (const id of frozenIds) push(byId.get(id))
    // 3. Подстраховка: посты, появившиеся после заморозки и не вошедшие в порядок.
    for (const p of allPosts) push(p)
    return out
  }, [allPosts, authorId, ranked, frozenIds, justPostedIds, sortMode, followingIds])

  // Рендерим ленту порциями по PAGE_SIZE: в DOM только видимое окно, остальное
  // подгружается по мере прокрутки (sentinel + IntersectionObserver).
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const hasMore = visible < posts.length

  // Сброс окна при смене контекста ленты (профиль/аккаунт/режим сортировки).
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [authorId, myId, sortMode])

  // Якорь из уведомлений: гарантируем, что нужный пост попал в окно рендера,
  // затем прокручиваем к нему и кратко подсвечиваем.
  useEffect(() => {
    if (!focusPostId || !loaded) return
    const idx = posts.findIndex((p) => p.id === focusPostId)
    if (idx < 0) return
    if (idx >= visible) {
      setVisible(idx + 1)
      return // дождёмся ререндера с расширенным окном, эффект сработает снова
    }
    const el = document.getElementById(`post-${focusPostId}`)
    if (!el) return
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.classList.add(styles.postFocusFlash)
      window.setTimeout(() => el.classList.remove(styles.postFocusFlash), 2000)
    }, 60)
    return () => window.clearTimeout(t)
  }, [focusPostId, loaded, posts, visible])

  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible((v) => v + PAGE_SIZE)
      },
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, visible, posts.length])

  const showRecs = intersperse && isMobile
  const carousels = recSlots && recSlots.length ? recSlots : recCarousels

  // Раскладка рекомендаций в ленте (мобилка): случайная стартовая позиция (может быть
  // перед первым постом), разрыв REC_MIN..REC_MAX постов, случайный слот каждый раз.
  // Карта «индекс поста → слот карусели» (рекомендация рендерится ПЕРЕД этим постом;
  // индекс == posts.length → после последнего). Стабильна в рамках визита (seed).
  const recByIndex = useMemo(() => {
    const map = new Map<number, number>()
    if (!showRecs || carousels.length === 0) return map
    const rng = makeRng(recSeed)
    let at = Math.floor(rng() * (REC_MAX_GAP + 1)) // 0..MAX (0 — перед первым постом)
    let prev = -1
    const total = posts.length
    while (at <= total) {
      let slot = Math.floor(rng() * carousels.length)
      // Не повторяем подряд один и тот же слот (если есть из чего выбрать).
      if (carousels.length > 1 && slot === prev) {
        slot = (prev + 1 + Math.floor(rng() * (carousels.length - 1))) % carousels.length
      }
      map.set(at, slot)
      prev = slot
      at += REC_MIN_GAP + Math.floor(rng() * (REC_MAX_GAP - REC_MIN_GAP + 1)) // +MIN..+MAX
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRecs, carousels.length, posts.length, recSeed])

  // Скелетон: пока лента не загружена, либо (для ранжированной ленты) пока не готовы
  // сигналы ранжирования — чтобы посты появились сразу в финальном порядке.
  if (!loaded || !rankGateOpen) {
    return <FeedSkeleton />
  }

  if (!posts.length) {
    return (
      <div className={styles.feedEmpty}>
        {authorId
          ? 'Публикаций пока нет.'
          : 'Пока нет постов. Будь первым — напиши что-нибудь выше ☝️'}
      </div>
    )
  }

  const tailSlot = recByIndex.get(posts.length)

  return (
    <div className={styles.posts}>
      {posts.slice(0, visible).map((p, i) => {
        const slot = recByIndex.get(i)
        return (
          <Fragment key={p.id}>
            {slot !== undefined ? <div className={styles.feedRec}>{carousels[slot]}</div> : null}
            <div id={`post-${p.id}`} className={styles.postAnchor}>
              <PostCard post={p} />
            </div>
          </Fragment>
        )
      })}
      {/* Рекомендация после последнего поста (если выпала на конец и конец виден). */}
      {!hasMore && tailSlot !== undefined ? (
        <div className={styles.feedRec}>{carousels[tailSlot]}</div>
      ) : null}
      {hasMore ? <div ref={sentinelRef} className={styles.feedSentinel} aria-hidden /> : null}
    </div>
  )
}
