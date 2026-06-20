import { useState } from 'react'
import { useAppDispatch } from '../../../app/store/hooks'
import { addComment } from '../model/feedThunks'
import type { FeedPost } from '../model/types'
import { useAuthorIdentity } from '../lib/useAuthorIdentity'
import { Input } from '../../../shared/ui/Input/Input'
import styles from './Feed.module.css'

/** Форма добавления комментария (вынесена из списка, чтобы закреплять её внизу панели). */
export function CommentForm({ post }: { post: FeedPost }) {
  const dispatch = useAppDispatch()
  const me = useAuthorIdentity()
  const [comment, setComment] = useState('')

  return (
    <form
      className={styles.commentForm}
      onSubmit={(e) => {
        e.preventDefault()
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
      }}
    >
      <Input
        className={styles.commentInput}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Написать комментарий…"
      />
      <button
        className={styles.commentSubmit}
        type="submit"
        disabled={!comment.trim()}
        aria-label="Отправить"
        title="Отправить"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M22 2 11 13" />
          <path d="M22 2 15 22 11 13 2 9z" />
        </svg>
      </button>
    </form>
  )
}
