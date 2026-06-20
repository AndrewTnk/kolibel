import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch } from '../../../app/store/hooks'
import { addComment } from '../model/feedThunks'
import type { FeedPost } from '../model/types'
import { useAuthorIdentity } from '../lib/useAuthorIdentity'
import { AuthorAvatar, AuthorName } from './AuthorAvatar'
import { SendIcon } from './composerIcons'
import styles from './Feed.module.css'

/** «30 мая в 15:15» — формат даты комментария. */
function formatCommentDate(ts: number) {
  const d = new Date(ts)
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${date} в ${time}`
}

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
  const [comment, setComment] = useState('')

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

  function send() {
    const t = comment.trim()
    if (!t) return
    void dispatch(
      addComment({
        postId: post.id,
        authorName: me.name,
        authorAvatar: me.avatar,
        authorKind: me.kind,
        text: t,
      }),
    )
    setComment('')
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
            post.comments.map((c) => (
              <div key={c.id} className={styles.comment}>
                <AuthorAvatar id={c.authorId} name={c.authorName} avatar={c.authorAvatar} kind={c.authorKind} size={36} />
                <div className={styles.commentBody}>
                  <div className={styles.commentBubble}>
                    <AuthorName id={c.authorId} name={c.authorName} logo={c.authorCompanyLogo} logoTitle={c.authorSubtitle} className={styles.commentAuthor} />
                    <div className={styles.commentDate}>
                      {c.authorSubtitle ? `${c.authorSubtitle} · ` : ''}
                      {formatCommentDate(c.createdAt)}
                    </div>
                    <div className={styles.commentText}>{c.text}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.cmEmpty}>Стань первым, кто оставит комментарий</div>
          )}
        </div>

        <form
          className={styles.cmInput}
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <AuthorAvatar name={me.name} avatar={me.avatar} kind={me.kind} size={36} />
          <input
            className={styles.cmField}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Оставь комментарий…"
            aria-label="Комментарий"
          />
          <button className={styles.cmSend} type="submit" disabled={!comment.trim()} aria-label="Отправить">
            <span className={styles.cmSendText}>Отправить</span>
            <span className={styles.cmSendIcon} aria-hidden><SendIcon /></span>
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
