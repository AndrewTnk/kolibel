import { useEffect, useState, type ReactNode } from 'react'
import { AppHeader } from '../../../../shared/ui/AppHeader/AppHeader'
import { useAppDispatch, useAppSelector } from '../../../../app/store/hooks'
import { useIsMobile } from '../../../../shared/lib/useMediaQuery'
import { ArticlesBlock } from '../../../articles/ui/ArticlesBlock'
import { loadAuthorArticles } from '../../../articles/model/articleThunks'
import { PortfolioTab } from '../../../portfolio/ui/PortfolioTab'
import { loadPortfolio } from '../../../portfolio/model/portfolioThunks'
import { PostComposer } from '../../../feed/ui/PostComposer'
import { FeedList } from '../../../feed/ui/FeedList'
import { BlockSkeleton } from '../../../../shared/ui/Skeleton/Skeleton'
import type { Resume } from '../../model/types'
import { Hero } from './Hero'
import { ResumeView, DEFAULT_LAYOUT, type SectionId } from './ResumeView'
import { SideRail } from './SideRail'
import { ProfileModals, type ProfileModalState } from './ProfileModals'
import { Ic } from './icons'
import s from './ProfileSheet.module.css'

type Props = {
  /** Данные резюме для просмотра чужого профиля. Без него — свой (из стора). */
  resume?: Resume
  /** Режим просмотра: без редактирования, своя строка действий и рейл. */
  readOnly?: boolean
  /** Строка действий в hero (для публичного: +Связь / Написать / ⋯). */
  heroActions?: ReactNode
  /** Правый рейл (для публичного: сеть + похожие). По умолчанию — `SideRail` владельца. */
  rail?: ReactNode
  /** Чей фид постов показывать (по умолчанию — текущий пользователь). */
  postsAuthorId?: string
  /** Кнопка «назад» в баннере (мобилка, просмотр чужого профиля). */
  onBack?: () => void
}

export function ProfileSheet({ resume, readOnly = false, heroActions, rail, postsAuthorId, onBack }: Props) {
  const dispatch = useAppDispatch()
  const storeLoaded = useAppSelector((st) => st.profile.loaded)
  const loaded = resume ? true : storeLoaded
  const isMobile = useIsMobile()
  const myId = useAppSelector((st) => st.auth.user?.id)
  const authorId = postsAuthorId ?? myId
  const postCount = useAppSelector(
    (st) => st.feed.posts.filter((p) => p.authorId === authorId).length,
  )

  // Статьи автора — для счётчика на вкладке (мобилка) и чтобы вкладка была наполнена.
  const articlesLoaded = useAppSelector((st) => st.articles.loadedAuthors.includes(authorId ?? ''))
  const articleCount = useAppSelector(
    (st) => (st.articles.byAuthor[authorId ?? ''] ?? []).filter((a) => !readOnly || a.status === 'published').length,
  )
  useEffect(() => {
    if (authorId && !articlesLoaded) void dispatch(loadAuthorArticles(authorId))
  }, [dispatch, authorId, articlesLoaded])

  // Портфолио — для счётчика на вкладке и видимости вкладки у чужого профиля.
  const portfolioLoaded = useAppSelector((st) => st.portfolio.loadedOwners.includes(authorId ?? ''))
  const portfolioCount = useAppSelector((st) => (st.portfolio.byOwner[authorId ?? ''] ?? []).length)
  useEffect(() => {
    if (authorId && !portfolioLoaded) void dispatch(loadPortfolio(authorId))
  }, [dispatch, authorId, portfolioLoaded])

  const [tab, setTab] = useState<'resume' | 'posts' | 'portfolio' | 'articles'>('resume')
  const [modal, setModal] = useState<ProfileModalState>(null)
  const [layout, setLayout] = useState<SectionId[]>(DEFAULT_LAYOUT)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2400)
  }

  return (
    <div className={s.page}>
      <AppHeader />
      <main className={s.main}>
        <div className={s.layout}>
          <div className={s.colCenter}>
            {!loaded ? (
              <BlockSkeleton height={520} />
            ) : (
              <>
              <div className={s.sheet}>
                <Hero
                  open={setModal}
                  showToast={showToast}
                  resume={resume}
                  readOnly={readOnly}
                  actions={heroActions}
                  viewedId={postsAuthorId}
                  onBack={onBack}
                />

                <div className={s.sheetTabs} role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'resume'}
                    className={[s.tab, tab === 'resume' ? s.tabOn : ''].filter(Boolean).join(' ')}
                    onClick={() => setTab('resume')}
                  >
                    <Ic.briefcase /> Резюме
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'posts'}
                    className={[s.tab, tab === 'posts' ? s.tabOn : ''].filter(Boolean).join(' ')}
                    onClick={() => setTab('posts')}
                  >
                    <Ic.chart /> Посты
                    {postCount > 0 ? <span className={s.tabCount}>{postCount}</span> : null}
                  </button>
                  {/* Портфолио — у себя всегда, у чужого профиля — только если есть работы. */}
                  {!readOnly || portfolioCount > 0 ? (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === 'portfolio'}
                      className={[s.tab, tab === 'portfolio' ? s.tabOn : ''].filter(Boolean).join(' ')}
                      onClick={() => setTab('portfolio')}
                    >
                      <Ic.layout /> Портфолио
                      {portfolioCount > 0 ? <span className={s.tabCount}>{portfolioCount}</span> : null}
                    </button>
                  ) : null}
                  {/* Статьи — отдельной вкладкой только на мобилке (на десктопе блок в сайдбаре). */}
                  {isMobile && (!readOnly || articleCount > 0) ? (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === 'articles'}
                      className={[s.tab, tab === 'articles' ? s.tabOn : ''].filter(Boolean).join(' ')}
                      onClick={() => setTab('articles')}
                    >
                      <Ic.pencil /> Статьи
                      {articleCount > 0 ? <span className={s.tabCount}>{articleCount}</span> : null}
                    </button>
                  ) : null}
                </div>

                {tab === 'resume' ? (
                  <ResumeView layout={layout} open={setModal} resume={resume} readOnly={readOnly} />
                ) : null}
              </div>

              {/* Посты/статьи — вне карточки профиля, на фоне страницы (как лента на главной). */}
              {tab === 'posts' ? (
                <div className={s.postsTab}>
                  {readOnly || isMobile ? null : <PostComposer compact />}
                  <FeedList authorId={authorId} />
                </div>
              ) : tab === 'portfolio' ? (
                <div className={s.postsTab}>
                  {authorId ? <PortfolioTab ownerId={authorId} canEdit={!readOnly} /> : null}
                </div>
              ) : tab === 'articles' && isMobile ? (
                <div className={s.postsTab}>
                  {authorId ? <ArticlesBlock authorId={authorId} canEdit={!readOnly} variant="page" /> : null}
                </div>
              ) : null}
              </>
            )}
          </div>

          <aside className={s.colRail} aria-label="Готовность, аналитика и рекомендации">
            {rail ?? <SideRail open={setModal} showToast={showToast} />}
          </aside>
        </div>
      </main>

      {readOnly ? null : (
        <ProfileModals active={modal} onClose={() => setModal(null)} showToast={showToast} layout={layout} onLayoutChange={setLayout} />
      )}

      {toast ? (
        <div className={s.toastWrap}>
          <div className={s.toast}>
            <Ic.check size={14} /> {toast}
          </div>
        </div>
      ) : null}
    </div>
  )
}
