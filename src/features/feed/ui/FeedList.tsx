import { useEffect, useMemo, Fragment } from 'react'
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

export function FeedList({
  intersperse = false,
  authorId,
  hideOwn = false,
  ranked = false,
  recSlots,
}: {
  intersperse?: boolean
  /** Показать только посты этого автора (режим профиля). */
  authorId?: string
  /** Скрыть собственные посты текущего пользователя (режим общей ленты). */
  hideOwn?: boolean
  /** Ранжировать единым score + разнообразие (общая лента на главной). */
  ranked?: boolean
  /** Чем чередовать ленту на мобилке (по умолчанию — пользовательские рекомендации).
   *  Страница задаёт сама, чтобы не тянуть widgets в feature (FSD). */
  recSlots?: React.ReactNode[]
}) {
  const dispatch = useAppDispatch()
  const allPosts = useAppSelector((s) => s.feed.posts)
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
    // Профиль — только посты автора; общая лента — без собственных постов.
    const filtered = allPosts.filter((p) => {
      if (authorId) return p.authorId === authorId
      if (hideOwn && myId) return p.authorId !== myId
      return true
    })
    if (!ranked) return filtered
    const ctx: RankContext = { myId, followingIds: new Set(followingIds), myInterests }
    return rankFeed(filtered, ctx)
  }, [allPosts, authorId, hideOwn, myId, ranked, followingIds, myInterests])

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
      {posts.map((p, i) => {
        const recIndex = Math.floor(i / REC_EVERY) % carousels.length
        const insertRec = showRecs && (i + 1) % REC_EVERY === 0
        return (
          <Fragment key={p.id}>
            <PostCard post={p} />
            {insertRec ? <div className={styles.feedRec}>{carousels[recIndex]}</div> : null}
          </Fragment>
        )
      })}
    </div>
  )
}
