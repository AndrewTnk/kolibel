import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { useIsMobile } from '../../../shared/lib/useMediaQuery'
import { feedActions } from '../model/feedSlice'
import { addComment, loadFeed } from '../model/feedThunks'
import type { FeedPost } from '../model/types'
import { useAuthorIdentity } from '../lib/useAuthorIdentity'
import { AuthorAvatar, AuthorName } from './AuthorAvatar'
import { PostActions } from './PostActions'
import { PostMedia, type MediaItem } from './PostMedia'
import { PostLightbox } from './PostLightbox'
import { CommentList } from './CommentList'
import { CommentComposer } from './CommentComposer'
import { emojify } from '../../../shared/ui/Emoji/emojify'
import { formatPostTime } from './PostCard'
import styles from './Feed.module.css'

/**
 * Модалка поста (только веб): пост целиком (текст/медиа/действия) сверху +
 * комментарии снизу. Открывается из ленты (клик по посту) и из уведомлений
 * (openPost). Глобально смонтирована в RootLayout. Данные — из стора ленты.
 */
export function PostModal() {
  const dispatch = useAppDispatch()
  const isMobile = useIsMobile()
  const openPostId = useAppSelector((s) => s.feed.openPostId)
  const loaded = useAppSelector((s) => s.feed.loaded)
  const status = useAppSelector((s) => s.feed.status)
  const post = useAppSelector((s) => s.feed.posts.find((p) => p.id === openPostId))

  // Если открыли пост, которого нет в сторе (напр. из уведомления на /chat) — догрузим ленту.
  useEffect(() => {
    if (openPostId && !loaded && status === 'idle') void dispatch(loadFeed())
  }, [openPostId, loaded, status, dispatch])

  // На мобилке модалку не показываем (там читают пост в ленте через «Показать ещё»).
  if (isMobile || !openPostId) return null
  return <PostModalInner post={post} loading={!loaded} onClose={() => dispatch(feedActions.closePost())} />
}

function PostModalInner({
  post,
  loading,
  onClose,
}: {
  post: FeedPost | undefined
  loading: boolean
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const me = useAuthorIdentity()
  const [lightbox, setLightbox] = useState<number | null>(null)
  const inputRef = useRef<{ focus: () => void } | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function send(text: string) {
    if (!post) return
    void dispatch(
      addComment({ postId: post.id, authorName: me.name, authorAvatar: me.avatar, authorKind: me.kind, text }),
    )
  }

  const media = post
    ? (post.content.filter((c) => c.kind === 'image' || c.kind === 'video') as MediaItem[])
    : []
  let mediaRendered = false

  return createPortal(
    <div className={styles.pmOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Публикация">
      <div className={styles.pmPanel} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.pmClose} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>

        <div className={styles.pmScroll}>
          {!post ? (
            <div className={styles.pmState}>{loading ? 'Загрузка…' : 'Публикация не найдена или удалена.'}</div>
          ) : (
            <>
              <article className={styles.post} style={{ border: 0, boxShadow: 'none', padding: 0 }}>
                <header className={styles.postHeader}>
                  <AuthorAvatar id={post.authorId} name={post.authorName} avatar={post.authorAvatar} kind={post.authorKind} size={42} />
                  <div className={styles.postMeta}>
                    <div className={styles.postAuthor}>
                      <AuthorName id={post.authorId} name={post.authorName} logo={post.authorCompanyLogo} logoTitle={post.authorSubtitle} />
                    </div>
                    <div className={styles.postTime}>
                      {post.authorSubtitle ? `${post.authorSubtitle} · ` : ''}
                      {formatPostTime(post.createdAt)}
                    </div>
                  </div>
                </header>

                <div className={styles.postBody}>
                  {post.content.map((c, idx) => {
                    if (c.kind === 'text')
                      return (
                        <div key={idx} className={styles.text}>
                          {emojify(c.text)}
                        </div>
                      )
                    if (c.kind === 'image' || c.kind === 'video') {
                      if (mediaRendered) return null
                      mediaRendered = true
                      return <PostMedia key="media" media={media} onOpen={(mi) => setLightbox(mi)} />
                    }
                    if (c.kind === 'document')
                      return (
                        <a key={idx} className={styles.docCard} href={c.url} target="_blank" rel="noreferrer" download={c.name}>
                          <span className={styles.docIcon} aria-hidden>
                            <svg viewBox="0 0 24 24" width="20" height="20">
                              <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M6 2h8l4 4v16H6z M14 2v4h4" />
                            </svg>
                          </span>
                          <span className={styles.docName}>{c.name}</span>
                          <span className={styles.docAction}>Открыть</span>
                        </a>
                      )
                    if (c.kind === 'vacancy')
                      return (
                        <div key={idx} className={styles.vacancyCard}>
                          <div className={styles.vacancyCardLabel}>Вакансия</div>
                          <div className={styles.vacancyCardTitle}>{c.title}</div>
                          <div className={styles.vacancyCardMeta}>
                            {c.salary} · {c.city}
                          </div>
                          <button type="button" className={styles.vacancyCardBtn}>
                            Откликнуться
                          </button>
                        </div>
                      )
                    return null
                  })}
                </div>

                <PostActions post={post} commentsOpen onCommentClick={() => inputRef.current?.focus()} />
              </article>

              <div className={styles.pmCommentsTitle}>Комментарии</div>
              {post.comments.length ? (
                <CommentList post={post} />
              ) : (
                <div className={styles.pmState}>Стань первым, кто оставит комментарий</div>
              )}
            </>
          )}
        </div>

        {post ? (
          <div className={styles.pmInput}>
            <CommentComposer ref={inputRef} onSend={send} me={me} />
          </div>
        ) : null}
      </div>

      {post && lightbox !== null ? (
        <PostLightbox post={post} startIndex={lightbox} onClose={() => setLightbox(null)} />
      ) : null}
    </div>,
    document.body,
  )
}
