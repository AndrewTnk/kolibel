import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { loadAuthorArticles, deleteArticle } from '../model/articleThunks'
import { formatArticleDateShort, formatViews } from '../lib/articleFormat'
import type { Article } from '../model/types'
import { ArticleEditorModal } from './ArticleEditorModal'
import s from './ArticlesBlock.module.css'

const DELETE_DELAY = 5 // секунд до удаления (можно отменить)

type Props = {
  /** Чьи статьи показываем. */
  authorId: string
  /** Можно ли добавлять/редактировать (свой профиль). */
  canEdit?: boolean
  /** `rail` — компактный блок в сайдбаре (скролл-кап); `page` — полный список (мобильная вкладка). */
  variant?: 'rail' | 'page'
  /** Заголовок блока (по умолчанию «Статьи пользователя»). */
  title?: string
}

export function ArticlesBlock({ authorId, canEdit = false, variant = 'rail', title = 'Статьи пользователя' }: Props) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const articles = useAppSelector((st) => st.articles.byAuthor[authorId])
  const loaded = useAppSelector((st) => st.articles.loadedAuthors.includes(authorId))
  const [editorOpen, setEditorOpen] = useState(false)

  useEffect(() => {
    if (authorId && !loaded) void dispatch(loadAuthorArticles(authorId))
  }, [dispatch, authorId, loaded])

  // Чужим показываем только опубликованное; себе — всё (включая черновики).
  const list = (articles ?? []).filter((a) => canEdit || a.status === 'published')

  // Пустой блок у чужого профиля не показываем вовсе.
  if (loaded && list.length === 0 && !canEdit) return null

  return (
    <div className={[s.card, variant === 'page' ? s.cardPage : ''].filter(Boolean).join(' ')}>
      <div className={s.head}>
        <span className={s.label}>{title}</span>
        <div className={s.headRight}>
          {list.length > 0 ? <span className={s.count}>{list.length} публикаций</span> : null}
          {canEdit ? (
            <button type="button" className={s.add} onClick={() => setEditorOpen(true)} aria-label="Новая статья" title="Новая статья">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {list.length === 0 ? (
        canEdit ? (
          <button type="button" className={s.empty} onClick={() => setEditorOpen(true)}>
            + Написать первую статью
          </button>
        ) : null
      ) : (
        <div className={variant === 'page' ? s.scrollPage : s.scroll}>
          {list.map((a) => (
            <ArticleRow key={a.id} article={a} canEdit={canEdit} onOpen={() => navigate(`/article/${a.id}`)} />
          ))}
        </div>
      )}

      {editorOpen ? (
        <ArticleEditorModal
          onClose={() => setEditorOpen(false)}
          onSaved={(id) => navigate(`/article/${id}`)}
        />
      ) : null}
    </div>
  )
}

/** Строка статьи в блоке + ✕ для удаления с отсчётом и возможностью отмены (5 c). */
function ArticleRow({ article, canEdit, onOpen }: { article: Article; canEdit: boolean; onOpen: () => void }) {
  const dispatch = useAppDispatch()
  const [pending, setPending] = useState(false)
  const [seconds, setSeconds] = useState(DELETE_DELAY)

  useEffect(() => {
    if (!pending) return
    if (seconds <= 0) {
      void dispatch(deleteArticle(article.id))
      return
    }
    const t = window.setTimeout(() => setSeconds((x) => x - 1), 1000)
    return () => window.clearTimeout(t)
  }, [pending, seconds, dispatch, article.id])

  if (pending) {
    return (
      <div className={s.deleting}>
        <span className={s.delText}>Удаление через {seconds} с</span>
        <button type="button" className={s.delCancel} onClick={() => setPending(false)}>
          Отменить
        </button>
      </div>
    )
  }

  return (
    <div className={s.itemWrap}>
      <button type="button" className={s.item} onClick={onOpen}>
        <span className={s.cat}>{article.category || 'Без категории'}</span>
        <span className={s.title}>{article.title}</span>
        <span className={s.meta}>
          {article.status === 'draft' ? <span className={s.draft}>Черновик</span> : null}
          {formatArticleDateShort(article.publishedAt ?? article.createdAt)}
          {' · '}
          {formatViews(article.views)}
        </span>
      </button>
      {canEdit ? (
        <button
          type="button"
          className={s.del}
          onClick={() => {
            setSeconds(DELETE_DELAY)
            setPending(true)
          }}
          aria-label="Удалить статью"
          title="Удалить статью"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
