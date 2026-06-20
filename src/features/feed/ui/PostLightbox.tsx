import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch } from '../../../app/store/hooks'
import { useIsMobile } from '../../../shared/lib/useMediaQuery'
import { toggleLike } from '../model/feedThunks'
import type { FeedContent, FeedPost } from '../model/types'
import { AuthorAvatar, AuthorName } from './AuthorAvatar'
import { PostActions } from './PostActions'
import { PostComments } from './PostComments'
import { CommentForm } from './CommentForm'
import { PostCommentsModal } from './PostCommentsModal'
import styles from './Feed.module.css'

type MediaItem = Extract<FeedContent, { kind: 'image' | 'video' }>

/** «сегодня, 09:14» / «вчера, 17:32» / «4 июня, 11:08» — как на макете. */
function formatTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return `сегодня, ${time}`
  if (d.toDateString() === yest.toDateString()) return `вчера, ${time}`
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${time}`
}

/** Склонение «фотография» по числу: 1 фотография / 2 фотографии / 5 фотографий. */
function photosLabel(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} фотография`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} фотографии`
  return `${n} фотографий`
}

/** Увеличенный просмотр поста: шапка автора сверху, медиа-карусель, текст и комментарии — под ним. */
export function PostLightbox({
  post,
  startIndex = 0,
  onClose,
}: {
  post: FeedPost
  startIndex?: number
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const isMobile = useIsMobile()
  const media = post.content.filter((c) => c.kind === 'image' || c.kind === 'video') as MediaItem[]
  const [idx, setIdx] = useState(startIndex)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const swipeX = useRef<number | null>(null)

  const go = (dir: -1 | 1) =>
    setIdx((i) => Math.min(media.length - 1, Math.max(0, i + dir)))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx((i) => (i > 0 ? i - 1 : i))
      if (e.key === 'ArrowRight') setIdx((i) => (i < media.length - 1 ? i + 1 : i))
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [media.length, onClose])

  const cur = media[idx]
  if (!cur) return null

  const photoCount = post.content.filter((c) => c.kind === 'image').length
  const textBlocks = post.content.filter((c) => c.kind === 'text') as Extract<FeedContent, { kind: 'text' }>[]

  return createPortal(
    <>
    <div className={styles.lbOverlay} onClick={onClose} role="dialog" aria-modal="true">
      {/* Левая часть — тёмная сцена с фото и навигацией */}
      <div className={styles.lbStage} onClick={(e) => e.stopPropagation()}>
        <button className={styles.lbClose} type="button" onClick={onClose} aria-label="Закрыть">
          ✕
        </button>

        <div
          className={styles.lbMedia}
          onPointerDown={(e) => {
            swipeX.current = e.clientX
          }}
          onPointerUp={(e) => {
            if (swipeX.current === null) return
            const dx = e.clientX - swipeX.current
            swipeX.current = null
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
          }}
        >
          {cur.kind === 'image' ? (
            <img className={styles.lbImg} src={cur.url} alt={cur.alt ?? ''} draggable={false} />
          ) : (
            <video className={styles.lbImg} src={cur.url} controls autoPlay playsInline />
          )}
        </div>

        {media.length > 1 ? (
          <>
            <button
              className={[styles.lbNav, styles.lbPrev].join(' ')}
              type="button"
              disabled={idx === 0}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              aria-label="Предыдущее"
            >
              ‹
            </button>
            <button
              className={[styles.lbNav, styles.lbNext].join(' ')}
              type="button"
              disabled={idx === media.length - 1}
              onClick={() => setIdx((i) => Math.min(media.length - 1, i + 1))}
              aria-label="Следующее"
            >
              ›
            </button>
            <div className={styles.lbCounter}>
              {idx + 1} / {media.length}
            </div>
          </>
        ) : null}

        {/* Мобилка: фото на весь экран + панель действий снизу (комментарии — отдельным окном) */}
        {isMobile ? (
          <div className={styles.lbBar} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={[styles.lbBarBtn, post.likedByMe ? styles.lbBarBtnActive : ''].join(' ')}
              onClick={() => dispatch(toggleLike(post.id))}
              aria-pressed={post.likedByMe}
              aria-label="Нравится"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill={post.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M7 22V11l5-9 1 1v7h7l-3 10z" />
              </svg>
              {post.likesCount > 0 ? <span>{post.likesCount}</span> : null}
            </button>
            <button type="button" className={styles.lbBarBtn} onClick={() => setCommentsOpen(true)} aria-label="Комментарии">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {post.comments.length > 0 ? <span>{post.comments.length}</span> : null}
            </button>
            <button type="button" className={styles.lbBarBtn} aria-label="Поделиться" onClick={() => {}}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
                <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      {/* Правая панель (только десктоп) — автор, текст, действия, комментарии */}
      {!isMobile ? (
      <aside className={styles.lbSide} onClick={(e) => e.stopPropagation()}>
        <div className={styles.lbAuthor}>
          <AuthorAvatar
            id={post.authorId}
            name={post.authorName}
            avatar={post.authorAvatar}
            kind={post.authorKind}
            size={42}
          />
          <div className={styles.lbHeaderMeta}>
            <AuthorName id={post.authorId} name={post.authorName} logo={post.authorCompanyLogo} logoTitle={post.authorSubtitle} className={styles.lbAuthorName} />
            <div className={styles.lbAuthorRole}>
              {post.authorSubtitle ? `${post.authorSubtitle} · ` : ''}
              {formatTime(post.createdAt)}
              {photoCount > 0 ? ` · ${photosLabel(photoCount)}` : ''}
            </div>
          </div>
        </div>

        <div className={styles.lbSideScroll}>
          {textBlocks.map((c, i) => (
            <p key={i} className={styles.lbText}>
              {c.text}
            </p>
          ))}

          <PostActions post={post} />
          <PostComments post={post} />
        </div>

        {/* Форма ввода — вне скролла, закреплена внизу панели (не уезжает при добавлении). */}
        <CommentForm post={post} />
      </aside>
      ) : null}
    </div>
    {commentsOpen ? <PostCommentsModal post={post} onClose={() => setCommentsOpen(false)} /> : null}
    </>,
    document.body,
  )
}
