import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { deletePost } from '../model/feedThunks'
import type { FeedPost } from '../model/types'
import { MoreMenu, type MoreMenuItem } from '../../../shared/ui/MoreMenu/MoreMenu'
import { AuthorAvatar, AuthorName } from './AuthorAvatar'
import { PostActions } from './PostActions'
import { PostCommentsModal } from './PostCommentsModal'
import { PostLightbox } from './PostLightbox'
import { PostMedia, type MediaItem } from './PostMedia'
import styles from './Feed.module.css'

/** Время поста как на макете: «сегодня, 09:14» / «вчера, 17:32» / «4 июня, 11:08». */
export function formatPostTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const sameDay = d.toDateString() === now.toDateString()
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  if (sameDay) return `сегодня, ${time}`
  if (d.toDateString() === yest.toDateString()) return `вчера, ${time}`
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  return `${date}, ${time}`
}

export function PostCard({ post }: { post: FeedPost }) {
  const dispatch = useAppDispatch()
  const myId = useAppSelector((s) => s.auth.user?.id)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)

  const isOwn = !!myId && myId === post.authorId
  const menuItems: MoreMenuItem[] = isOwn
    ? [
        {
          label: 'Удалить пост',
          onClick: () => {
            if (window.confirm('Удалить пост? Это действие нельзя отменить.')) {
              void dispatch(deletePost(post.id))
            }
          },
        },
      ]
    : [{ label: 'Пожаловаться' }]

  // Все медиа поста (фото/видео) — рендерятся одним коллажем.
  const media = post.content.filter(
    (c) => c.kind === 'image' || c.kind === 'video',
  ) as MediaItem[]
  let mediaRendered = false

  return (
    <article className={styles.post}>
      <header className={styles.postHeader}>
        <AuthorAvatar id={post.authorId} name={post.authorName} avatar={post.authorAvatar} kind={post.authorKind} size={42} />
        <div className={styles.postMeta}>
          <div className={styles.postAuthor}>
            <AuthorName id={post.authorId} name={post.authorName} logo={post.authorCompanyLogo} logoTitle={post.authorSubtitle} />{' '}
            {post.authorMeta ? <span className={styles.badge}>{post.authorMeta}</span> : null}
          </div>
          <div className={styles.postTime}>
            {post.authorSubtitle ? `${post.authorSubtitle} · ` : ''}
            {formatPostTime(post.createdAt)}
          </div>
        </div>
        <MoreMenu className={styles.postMore} items={menuItems} />
      </header>

      <div className={styles.postBody}>
        {post.content.map((c, idx) => {
          if (c.kind === 'text')
            return (
              <div key={idx} className={styles.text}>
                {c.text}
              </div>
            )
          if (c.kind === 'image' || c.kind === 'video') {
            // Все медиа рисуем единым коллажем на месте первого медиа-блока.
            if (mediaRendered) return null
            mediaRendered = true
            return <PostMedia key="media" media={media} onOpen={(mi) => setLightbox(mi)} />
          }
          if (c.kind === 'document')
            return (
              <a
                key={idx}
                className={styles.docCard}
                href={c.url}
                target="_blank"
                rel="noreferrer"
                download={c.name}
              >
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

      <PostActions
        post={post}
        commentsOpen={commentsOpen}
        onCommentClick={() => setCommentsOpen(true)}
      />

      {commentsOpen ? <PostCommentsModal post={post} onClose={() => setCommentsOpen(false)} /> : null}

      {lightbox !== null ? (
        <PostLightbox post={post} startIndex={lightbox} onClose={() => setLightbox(null)} />
      ) : null}
    </article>
  )
}
