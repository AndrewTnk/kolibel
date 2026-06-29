import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import {
  loadArticle,
  loadAuthorArticles,
  incrementArticleView,
} from '../../features/articles/model/articleThunks'
import { articlesActions } from '../../features/articles/model/articlesSlice'
import { toggleFollow, loadNetwork } from '../../features/network/model/networkThunks'
import { fetchPublicProfile } from '../../features/profile/lib/publicProfileApi'
import { formatArticleDate, formatViews } from '../../features/articles/lib/articleFormat'
import { formatArticleDateShort } from '../../features/articles/lib/articleFormat'
import { ArticleEditorModal } from '../../features/articles/ui/ArticleEditorModal'
import { Markdown } from '../../shared/ui/Markdown/Markdown'
import { slugify } from '../../shared/lib/slug'
import type { Resume } from '../../features/profile/model/types'
import s from './ArticlePage.module.css'

type Heading = { id: string; text: string }

function extractHeadings(markdown: string): Heading[] {
  const out: Heading[] = []
  for (const line of markdown.split('\n')) {
    const m = /^##\s+(.+?)\s*$/.exec(line)
    if (m) out.push({ id: slugify(m[1]), text: m[1].replace(/[*_`]/g, '') })
  }
  return out
}

function initials(name?: string): string {
  if (!name) return '—'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
}

export function ArticlePage() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  // Назад на предыдущую страницу; если истории нет (прямой переход по ссылке) — на главную.
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/'))

  const article = useAppSelector((st) => st.articles.open)
  const status = useAppSelector((st) => st.articles.openStatus)
  const myId = useAppSelector((st) => st.auth.user?.id)
  const following = useAppSelector((st) =>
    article ? st.network.followingIds.includes(article.authorId) : false,
  )
  const others = useAppSelector((st) =>
    article ? (st.articles.byAuthor[article.authorId] ?? []) : [],
  )

  const [authorResume, setAuthorResume] = useState<Resume | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeId, setActiveId] = useState<string>('')
  const [toast, setToast] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const canEdit = !!myId && article?.authorId === myId
  const toc = useMemo(() => extractHeadings(article?.body ?? ''), [article?.body])

  // Загрузка статьи + счётчик просмотра.
  useEffect(() => {
    if (!id) return
    void dispatch(loadArticle(id))
    void dispatch(incrementArticleView(id))
    window.scrollTo(0, 0)
    return () => {
      dispatch(articlesActions.clearOpen())
    }
  }, [dispatch, id])

  // Профиль автора (для футера) + другие статьи + сеть (для кнопки подписки).
  useEffect(() => {
    if (!article?.authorId) return
    void dispatch(loadAuthorArticles(article.authorId))
    void dispatch(loadNetwork())
    let alive = true
    void fetchPublicProfile(article.authorId).then((p) => {
      if (alive && p) setAuthorResume(p.resume)
    })
    return () => {
      alive = false
    }
  }, [dispatch, article?.authorId])

  // Прогресс чтения + активный пункт оглавления.
  useEffect(() => {
    if (!article) return
    function onScroll() {
      const el = contentRef.current
      if (!el) return
      const start = el.offsetTop
      const end = start + el.offsetHeight - window.innerHeight
      const p = end > start ? (window.scrollY - start) / (end - start) : 1
      setProgress(Math.max(0, Math.min(100, Math.round(p * 100))))

      // Активный заголовок — последний, чей верх выше линии чтения.
      let current = ''
      for (const h of toc) {
        const node = document.getElementById(h.id)
        if (node && node.getBoundingClientRect().top <= 140) current = h.id
      }
      setActiveId(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [article, toc])

  function go(hid: string) {
    document.getElementById(hid)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function share() {
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setToast('Ссылка скопирована')
      window.setTimeout(() => setToast(null), 2200)
    })
  }

  const otherArticles = others.filter((a) => a.id !== article?.id && a.status === 'published').slice(0, 3)

  if (status === 'loading' || (status === 'idle' && !article)) {
    return (
      <div className={s.page}>
        <div className={s.topbar}>
          <button type="button" className={s.back} onClick={goBack}>← Назад</button>
        </div>
        <div className={s.loading}>Загружаем статью…</div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className={s.page}>
        <div className={s.topbar}>
          <button type="button" className={s.back} onClick={goBack}>← Назад</button>
        </div>
        <div className={s.loading}>Статья не найдена или удалена.</div>
      </div>
    )
  }

  const authorName = authorResume?.fullName || article.authorName || 'Автор'
  const authorRole = article.authorRole || [authorResume?.jobTitle, authorResume?.jobStatus?.company].filter(Boolean).join(' · ')
  const authorAvatar = authorResume?.avatar || article.authorAvatar
  const authorLine = [authorRole, authorResume?.location].filter(Boolean).join(' · ')

  return (
    <div className={s.page}>
      {/* Топ-бар */}
      <div className={s.topbar}>
        <div className={s.topLeft}>
          <button type="button" className={s.back} onClick={goBack} aria-label="Назад" title="Назад">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span className="hideOnMobile">Назад</span>
          </button>
          <span className={s.brand}>Kolib<span className={s.brandAccent}>el</span></span>
        </div>
        <div className={s.topRight}>
          {canEdit ? (
            <button type="button" className={s.topBtn} onClick={() => setEditorOpen(true)} aria-label="Редактировать" title="Редактировать">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
              <span className="hideOnMobile">Редактировать</span>
            </button>
          ) : null}
          <button type="button" className={s.topBtn} onClick={share} aria-label="Поделиться" title="Поделиться">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
            </svg>
            <span className="hideOnMobile">Поделиться</span>
          </button>
        </div>
      </div>

      {/* Шапка статьи */}
      <header
        className={s.hero}
        style={article.coverUrl ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.55)), url(${article.coverUrl})` } : undefined}
        data-cover={article.coverUrl ? '1' : undefined}
      >
        <div className={s.heroInner}>
          {article.category ? <span className={s.cat}>● {article.category}</span> : null}
          <h1 className={s.title}>{article.title}</h1>
          {article.subtitle ? <p className={s.subtitle}>{article.subtitle}</p> : null}
          <div className={s.authorRow}>
            <span className={s.avatar}>
              {authorAvatar ? <img src={authorAvatar} alt="" /> : initials(authorName)}
            </span>
            <div className={s.authorMeta}>
              <span className={s.authorName}>{authorName}</span>
              {authorRole ? <span className={s.authorRole}>{authorRole}</span> : null}
            </div>
            <span className={s.dot} />
            <span className={s.metaItem}>{article.readingMinutes} мин чтения</span>
            <span className={s.dot} />
            <span className={s.metaItem}>{formatArticleDate(article.publishedAt ?? article.createdAt)}</span>
          </div>
        </div>
      </header>

      {/* Контент + сайдбар */}
      <div className={s.layout}>
        <article className={s.content} ref={contentRef}>
          <Markdown className={s.md}>{article.body}</Markdown>

          {/* Карточка автора */}
          <div className={s.authorCard}>
            <span className={s.authorCardAva}>
              {authorAvatar ? <img src={authorAvatar} alt="" /> : initials(authorName)}
            </span>
            <div className={s.authorCardBody}>
              <div className={s.authorCardName}>{authorName}</div>
              {authorLine ? <div className={s.authorCardRole}>{authorLine}</div> : null}
              {authorResume?.about ? <p className={s.authorCardBio}>{authorResume.about}</p> : null}
              <div className={s.authorCardActions}>
                <button type="button" className={s.acPrimary} onClick={() => navigate(`/u/${article.authorId}`)}>
                  Смотреть профиль
                </button>
                {!canEdit ? (
                  <button
                    type="button"
                    className={[s.acGhost, following ? s.acGhostOn : ''].filter(Boolean).join(' ')}
                    onClick={() => dispatch(toggleFollow(article.authorId))}
                  >
                    {following ? '✓ Вы подписаны' : '+ Подписаться'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </article>

        <aside className={s.rail}>
          {toc.length > 0 ? (
            <div className={s.tocCard}>
              <div className={s.tocLabel}>Содержание</div>
              <nav className={s.tocNav}>
                {toc.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className={[s.tocItem, activeId === h.id ? s.tocItemOn : ''].filter(Boolean).join(' ')}
                    onClick={() => go(h.id)}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>
            </div>
          ) : null}

          <div className={s.progressCard}>
            <div className={s.progressTop}>
              <span>Прочитано</span>
              <span className={s.progressPct}>{progress}%</span>
            </div>
            <div className={s.progressBar}>
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        </aside>
      </div>

      {/* Другие статьи автора */}
      {otherArticles.length > 0 ? (
        <div className={s.moreWrap}>
          <div className={s.moreLabel}>Другие статьи автора</div>
          <div className={s.moreGrid}>
            {otherArticles.map((a) => (
              <button key={a.id} type="button" className={s.moreCard} onClick={() => navigate(`/article/${a.id}`)}>
                {a.category ? <span className={s.moreCat}>{a.category}</span> : null}
                <span className={s.moreTitle}>{a.title}</span>
                <span className={s.moreMeta}>
                  {formatArticleDateShort(a.publishedAt ?? a.createdAt)} · {formatViews(a.views)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {editorOpen ? (
        <ArticleEditorModal article={article} onClose={() => setEditorOpen(false)} />
      ) : null}

      {toast ? <div className={s.toast}>{toast}</div> : null}
    </div>
  )
}
