import { type Ref } from 'react'
import type { FeedPost } from '../model/types'
import { AuthorAvatar, AuthorName } from './AuthorAvatar'
import styles from './Feed.module.css'

/** «30 мая в 15:15» — формат даты комментария. */
function formatCommentDate(ts: number) {
  const d = new Date(ts)
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${date} в ${time}`
}

/** Список комментариев (форма вынесена в `CommentForm`). Аватар/имя — ссылки на профиль. */
export function PostComments({ post, rootRef }: { post: FeedPost; rootRef?: Ref<HTMLDivElement> }) {
  if (!post.comments.length) return null
  return (
    <div className={styles.comments} ref={rootRef}>
      {post.comments.map((c) => (
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
      ))}
    </div>
  )
}
