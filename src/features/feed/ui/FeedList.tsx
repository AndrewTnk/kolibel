import { useEffect, useMemo, useRef, useState, Fragment } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { useIsMobile } from '../../../shared/lib/useMediaQuery'
import { loadFeed } from '../model/feedThunks'
import { rankFeed, type RankContext } from '../lib/rankFeed'
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
const REC_EVERY = 5
/** Сколько постов рендерим в DOM за раз (следующая порция — по скроллу вниз). */
const PAGE_SIZE = 20

export function FeedList({
  intersperse = false,
  authorId,
  ranked = false,
  recSlots,
}: {
  intersperse?: boolean
  /** Показать только посты этого автора (режим профиля). */
  authorId?: string
  /** Ранжировать единым score + разнообразие (общая лента на главной). */
  ranked?: boolean
  /** Чем чередовать ленту на мобилке (по умолчанию — пользовательские рекомендации).
   *  Страница задаёт сама, чтобы не тянуть widgets в feature (FSD). */
  recSlots?: React.ReactNode[]
}) {
  const dispatch = useAppDispatch()
  const allPosts = useAppSelector((s) => s.feed.posts)
  const justPostedIds = useAppSelector((s) => s.feed.justPostedIds)
  const myId = useAppSelector((s) => s.auth.user?.id)
  const loaded = useAppSelector((s) => s.feed.loaded)
  const isMobile = useIsMobile()

  // Сигналы для ранжирования (берём из стора; если пусто — ранжирование мягко деградирует).
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const accountType = useAppSelector((s) => s.account.type)
  const mySkills = useAppSelector((s) => s.profile.resume.skills)
  const myJobTitle = useAppSelector((s) => s.profile.resume.jobTitle)
  const companyIndustry = useAppSelector((s) => s.company.profile.industry)
  const companyDirections = useAppSelector((s) => s.company.profile.directions)

  // Перезагружаем ленту при смене аккаунта: resetStores чистит стор, но компонент
  // может не перемонтироваться (остаёмся на «/») — поэтому завязываемся на myId.
  useEffect(() => {
    void dispatch(loadFeed())
  }, [dispatch, myId])

  // Мои интересы: у компании — индустрия + направления; у человека — навыки + должность.
  const myInterests = useMemo(() => {
    const tokens =
      accountType === 'company'
        ? [companyIndustry, ...companyDirections.map((d) => d.title)]
        : [...mySkills, myJobTitle]
    return new Set(tokens.filter(Boolean).map((t) => t.trim().toLowerCase()))
  }, [accountType, companyIndustry, companyDirections, mySkills, myJobTitle])

  const posts = useMemo(() => {
    // Профиль — только посты автора; общая лента — все посты (включая свои).
    const filtered = authorId ? allPosts.filter((p) => p.authorId === authorId) : allPosts
    const ctx: RankContext = { myId, followingIds: new Set(followingIds), myInterests }
    const ordered = ranked ? rankFeed(filtered, ctx) : filtered
    // В общей ленте закрепляем свои только что опубликованные посты вверху —
    // чтобы автор сразу увидел свой пост (до перезагрузки ленты, затем — в общем алгоритме).
    if (authorId || !justPostedIds.length) return ordered
    const pinnedRank = new Map(justPostedIds.map((id, i) => [id, i]))
    const pinned = ordered.filter((p) => pinnedRank.has(p.id)).sort((a, b) => pinnedRank.get(a.id)! - pinnedRank.get(b.id)!)
    if (!pinned.length) return ordered
    const rest = ordered.filter((p) => !pinnedRank.has(p.id))
    return [...pinned, ...rest]
  }, [allPosts, authorId, myId, ranked, followingIds, myInterests, justPostedIds])

  // Рендерим ленту порциями по PAGE_SIZE: в DOM только видимое окно, остальное
  // подгружается по мере прокрутки (sentinel + IntersectionObserver).
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const hasMore = visible < posts.length

  // Сброс окна при смене контекста ленты (профиль/аккаунт) или уменьшении выборки.
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [authorId, myId])

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

  if (!loaded) {
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

  const showRecs = intersperse && isMobile
  const carousels = recSlots && recSlots.length ? recSlots : recCarousels

  return (
    <div className={styles.posts}>
      {posts.slice(0, visible).map((p, i) => {
        const recIndex = Math.floor(i / REC_EVERY) % carousels.length
        const insertRec = showRecs && (i + 1) % REC_EVERY === 0
        return (
          <Fragment key={p.id}>
            <PostCard post={p} />
            {insertRec ? <div className={styles.feedRec}>{carousels[recIndex]}</div> : null}
          </Fragment>
        )
      })}
      {hasMore ? <div ref={sentinelRef} className={styles.feedSentinel} aria-hidden /> : null}
    </div>
  )
}
