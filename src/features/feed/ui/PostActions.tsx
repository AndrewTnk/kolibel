import { useState, type Ref } from 'react'
import { useAppDispatch } from '../../../app/store/hooks'
import { toggleLike } from '../model/feedThunks'
import type { FeedPost } from '../model/types'
import { ShareToChatModal } from '../../chat/ui/ShareToChatModal'
import type { ChatAttach } from '../../chat/model/types'
import styles from './Feed.module.css'

/** Снимок поста для пересылки в чат (рендерится как полноценный пост, без сокращений). */
export function buildPostShareAttach(post: FeedPost): ChatAttach {
  const text = post.content
    .filter((c) => c.kind === 'text')
    .map((c) => (c.kind === 'text' ? c.text : ''))
    .join('\n\n')
    .trim()
  const media = post.content
    .filter((c) => c.kind === 'image' || c.kind === 'video')
    .map((c) => ({ kind: c.kind as 'image' | 'video', url: (c as { url: string }).url }))

  return {
    kind: 'post',
    title: post.authorName,
    post: {
      authorId: post.authorId,
      authorName: post.authorName,
      authorAvatar: post.authorAvatar,
      authorKind: post.authorKind,
      authorSubtitle: post.authorSubtitle,
      createdAt: post.createdAt,
      text: text || undefined,
      media: media.length ? media : undefined,
    },
  }
}

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
  const [shareOpen, setShareOpen] = useState(false)

  const shareAttach = buildPostShareAttach(post)

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
        onClick={() => setShareOpen(true)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
          <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
        </svg>
      </button>
      {shareOpen ? (
        <ShareToChatModal
          message={{ attach: shareAttach }}
          title="Поделиться публикацией"
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </div>
  )
}
