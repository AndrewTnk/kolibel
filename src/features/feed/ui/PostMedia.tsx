import type { FeedContent } from '../model/types'
import styles from './Feed.module.css'

export type MediaItem = Extract<FeedContent, { kind: 'image' | 'video' }>

function VideoOverlay() {
  return (
    <span className={styles.playOverlay} aria-hidden>
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  )
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  )
}

/**
 * Сетка-коллаж медиа поста (гармоничная раскладка, как в VK):
 * 1 — во всю ширину; 2 — рядом; 3 — большое слева + два стопкой справа; 4+ — 2×2 с «+N».
 * Клик по элементу открывает увеличенный просмотр на этом индексе.
 */
export function PostMedia({
  media,
  onOpen,
}: {
  media: MediaItem[]
  onOpen: (mediaIndex: number) => void
}) {
  const n = media.length
  if (n === 0) return null

  // Одно медиа — целиком, без обрезки (contain).
  if (n === 1) {
    const m = media[0]
    // Видео играем сразу в ленте (controls), а иконка-«развернуть» открывает увеличенный просмотр.
    if (m.kind === 'video') {
      return (
        <div className={[styles.media, styles.videoWrap].join(' ')}>
          <video className={styles.video} src={m.url} controls playsInline preload="metadata" />
          <button
            type="button"
            className={styles.expandBtn}
            onClick={() => onOpen(0)}
            aria-label="Развернуть видео"
            title="Развернуть"
          >
            <ExpandIcon />
          </button>
        </div>
      )
    }
    return (
      <button
        type="button"
        className={[styles.media, styles.mediaBtn].join(' ')}
        onClick={() => onOpen(0)}
        aria-label="Открыть фото"
      >
        <img className={styles.image} src={m.url} alt={m.alt ?? ''} loading="lazy" />
      </button>
    )
  }

  const layoutCls =
    n === 2 ? styles.collage2 : n === 3 ? styles.collage3 : styles.collage4
  const visible = media.slice(0, n > 4 ? 4 : n)
  const extra = n - visible.length

  return (
    <div className={[styles.collage, layoutCls].join(' ')}>
      {visible.map((m, i) => (
        <button
          key={i}
          type="button"
          className={styles.collageCell}
          onClick={() => onOpen(i)}
          aria-label={m.kind === 'image' ? 'Открыть фото' : 'Открыть видео'}
        >
          {m.kind === 'image' ? (
            <img className={styles.collageMedia} src={m.url} alt={m.alt ?? ''} loading="lazy" />
          ) : (
            <>
              <video className={styles.collageMedia} src={m.url} playsInline muted />
              <VideoOverlay />
            </>
          )}
          {extra > 0 && i === visible.length - 1 ? (
            <span className={styles.collageMore}>+{extra}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
