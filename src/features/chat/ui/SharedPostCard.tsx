import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch } from '../../../app/store/hooks'
import { useIsMobile } from '../../../shared/lib/useMediaQuery'
import { feedActions } from '../../feed/model/feedSlice'
import { ChatAvatar } from './ChatAvatar'
import { PostMedia, type MediaItem } from '../../feed/ui/PostMedia'
import { emojify } from '../../../shared/ui/Emoji/emojify'
import type { SharedPost } from '../model/types'
import styles from './Chat.module.css'

/** «сегодня, 09:14» / «вчера, 17:32» / «4 июня, 11:08». */
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

/**
 * Пересланный пост — рендерится как полноценный пост (автор + медиа-коллаж + полный
 * текст), без сокращений и без перехода (посты на отдельной странице не открываются).
 * Медиа переиспользует ленточный `PostMedia` (тот же VK-коллаж); клик по фото —
 * полноэкранный просмотр в этой же вкладке.
 */
export function SharedPostCard({ post }: { post: SharedPost }) {
  const dispatch = useAppDispatch()
  const isMobile = useIsMobile()
  const [zoom, setZoom] = useState<string | null>(null)
  const [textExpanded, setTextExpanded] = useState(false)
  const media = (post.media ?? []).map((m) => ({ kind: m.kind, url: m.url })) as MediaItem[]
  // Шапка кликабельна на вебе, если известен id поста → открывает модалку поста.
  const canOpen = !isMobile && !!post.id
  const openPost = () => post.id && dispatch(feedActions.openPost(post.id))
  // Длинный текст (>200 симв.) сворачиваем → «Показать ещё»/«Свернуть».
  const longText = !!post.text && post.text.length > 200
  const shownText =
    longText && !textExpanded ? post.text!.slice(0, 200).trimEnd() + '…' : (post.text ?? '')

  useEffect(() => {
    if (!zoom) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setZoom(null)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [zoom])

  return (
    <div className={styles.sharedPost}>
      <div
        className={[styles.spHead, canOpen ? styles.spHeadClickable : ''].filter(Boolean).join(' ')}
        onClick={canOpen ? openPost : undefined}
        role={canOpen ? 'button' : undefined}
        title={canOpen ? 'Открыть пост' : undefined}
      >
        <ChatAvatar
          name={post.authorName}
          avatar={post.authorAvatar}
          square={post.authorKind === 'company'}
          size={36}
        />
        <div className={styles.spMeta}>
          <div className={styles.spName}>{post.authorName}</div>
          <div className={styles.spTime}>
            {post.authorSubtitle ? `${post.authorSubtitle} · ` : ''}
            {formatTime(post.createdAt)}
          </div>
        </div>
      </div>

      {media.length ? (
        <div className={styles.spMedia}>
          <PostMedia
            media={media}
            onOpen={(i) => {
              const m = media[i]
              if (m?.kind === 'image') setZoom(m.url)
            }}
          />
        </div>
      ) : null}

      {post.text ? (
        <>
          <div className={styles.spText}>
            {shownText.split('\n\n').map((p, i) => (
              <p key={i}>{emojify(p)}</p>
            ))}
          </div>
          {longText ? (
            <button type="button" className={styles.spTextMore} onClick={() => setTextExpanded((v) => !v)}>
              {textExpanded ? 'Свернуть' : 'Показать ещё'}
            </button>
          ) : null}
        </>
      ) : null}

      {zoom
        ? createPortal(
            <div className={styles.imgLbOverlay} onClick={() => setZoom(null)} role="dialog" aria-modal="true">
              <button className={styles.imgLbClose} type="button" onClick={() => setZoom(null)} aria-label="Закрыть">
                ✕
              </button>
              <img className={styles.imgLbImg} src={zoom} alt="" onClick={(e) => e.stopPropagation()} />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
