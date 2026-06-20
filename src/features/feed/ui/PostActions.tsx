import { type Ref } from 'react'
import { useAppDispatch } from '../../../app/store/hooks'
import { toggleLike } from '../model/feedThunks'
import type { FeedPost } from '../model/types'
import styles from './Feed.module.css'

/** Иконки лайка и комментариев + счётчики (ноль не показываем). */
export function PostActions({
  post,
  onCommentClick,
  commentsOpen,
  commentBtnRef,
}: {
  post: FeedPost
  onCommentClick?: () => void
  commentsOpen?: boolean
  commentBtnRef?: Ref<HTMLButtonElement>
}) {
  const dispatch = useAppDispatch()
  return (
    <div className={styles.actions}>
      <button
        className={[styles.actionBtn, post.likedByMe ? styles.actionBtnActive : ''].join(' ')}
        type="button"
        onClick={() => dispatch(toggleLike(post.id))}
        aria-pressed={post.likedByMe}
        aria-label="Нравится"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill={post.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M7 22V11l5-9 1 1v7h7l-3 10z" />
        </svg>
        {post.likesCount > 0 ? <span>{post.likesCount}</span> : null}
      </button>
      <button
        ref={commentBtnRef}
        className={styles.actionBtn}
        type="button"
        onClick={onCommentClick}
        aria-expanded={commentsOpen}
        aria-label="Комментарии"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {post.comments.length > 0 ? <span>{post.comments.length}</span> : null}
      </button>
      <button
        className={styles.actionBtn}
        type="button"
        aria-label="Поделиться"
        title="Поделиться"
        onClick={() => {
          /* TODO: шеринг поста */
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
          <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
        </svg>
      </button>
    </div>
  )
}
