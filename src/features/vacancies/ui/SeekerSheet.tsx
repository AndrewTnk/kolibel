import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IcClose } from './icons'
import s from './Vacancies.module.css'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const sizeClass: Record<Size, string> = {
  sm: s.sheetSm,
  md: s.sheetMd,
  lg: s.sheetLg,
  xl: s.sheetXl,
}

type Props = {
  onClose: () => void
  size?: Size
  title?: string
  subtitle?: ReactNode
  hideHeader?: boolean
  /** Кастомный класс на sheet (для модалок с обложкой и т.п.). */
  sheetClassName?: string
  children: ReactNode
  footer?: ReactNode
  /** Прижать левую кнопку футера влево (вокруг неё в JSX оборачивать не нужно). */
  footerLeft?: ReactNode
  /** На мобилке (≤980px) разворачивать лист на весь экран (без скруглений/отступов). */
  fullScreenMobile?: boolean
}

/** Базовый каркас сидер-модалок: затемнение, лист, Esc, блокировка скролла. */
export function SeekerSheet({
  onClose,
  size,
  title,
  subtitle,
  hideHeader,
  sheetClassName,
  children,
  footer,
  footerLeft,
  fullScreenMobile,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div
      className={[s.scrim, fullScreenMobile ? s.scrimFull : ''].filter(Boolean).join(' ')}
      onClick={onClose}
    >
      <div
        className={[
          s.sheet,
          size ? sizeClass[size] : '',
          fullScreenMobile ? s.sheetFull : '',
          sheetClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideHeader ? (
          <div className={s.mHead}>
            <div>
              {title ? <div className={s.mTitle}>{title}</div> : null}
              {subtitle ? <div className={s.mSub}>{subtitle}</div> : null}
            </div>
            <button type="button" className={s.mClose} aria-label="Закрыть" onClick={onClose}>
              <IcClose />
            </button>
          </div>
        ) : null}

        {children}

        {footer || footerLeft ? (
          <div className={s.mFoot}>
            {footerLeft ? <div className={s.mFootLeft}>{footerLeft}</div> : null}
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
