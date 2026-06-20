import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './RecModal.module.css'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  /** Опциональная ширина панели (px). По умолчанию 720. */
  maxWidth?: number
  /** На мобилке (≤980px) разворачивать на весь экран (без скруглений/отступов). */
  fullScreenMobile?: boolean
}

export function RecModal({ title, onClose, children, maxWidth, fullScreenMobile }: Props) {
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

  return createPortal(
    <div
      className={[styles.overlay, fullScreenMobile ? styles.overlayFull : ''].filter(Boolean).join(' ')}
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <div
        className={[styles.panel, fullScreenMobile ? styles.panelFull : ''].filter(Boolean).join(' ')}
        style={maxWidth ? { width: `min(${maxWidth}px, 100%)` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
