import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch } from '../../../app/store/hooks'
import { addComment } from '../model/feedThunks'
import type { FeedPost } from '../model/types'
import { useAuthorIdentity } from '../lib/useAuthorIdentity'
import { CommentList } from './CommentList'
import { CommentComposer } from './CommentComposer'
import styles from './Feed.module.css'

function commentsWord(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'комментарий'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'комментария'
  return 'комментариев'
}

/** Модалка комментариев к посту (как в макете): шапка, статы, лента-пузыри, прикреплённый ввод. */
export function PostCommentsModal({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const dispatch = useAppDispatch()
  const me = useAuthorIdentity()

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
    void dispatch(
      addComment({
        postId: post.id,
        authorName: me.name,
        authorAvatar: me.avatar,
        authorKind: me.kind,
        text,
      }),
    )
  }

  return createPortal(
    <div className={styles.cmOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Комментарии">
      <div className={styles.cmPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.cmHead}>
          <div>
            <div className={styles.cmTitle}>Комментарии</div>
            <div className={styles.cmSub}>к посту: {post.authorName}</div>
          </div>
          <button className={styles.cmClose} type="button" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div className={styles.cmStats}>
          <span>
            <b>{post.likesCount}</b> отметок «Нравится»
          </span>
          <span className={styles.cmDot} aria-hidden />
          <span>
            <b>{post.comments.length}</b> {commentsWord(post.comments.length)}
          </span>
        </div>

        <div className={styles.cmList}>
          {post.comments.length ? (
            <CommentList post={post} />
          ) : (
            <div className={styles.cmEmpty}>Стань первым, кто оставит комментарий</div>
          )}
        </div>

        <div className={styles.cmInput}>
          <CommentComposer onSend={send} me={me} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
