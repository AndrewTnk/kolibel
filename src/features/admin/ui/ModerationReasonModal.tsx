import { useEffect, useState } from 'react'
import s from './admin.module.css'
import { Ic } from './icons'
import type { ModReason } from '../lib/moderationReasons'

type Props = {
  title: string
  /** Подзаголовок (например, имя цели). */
  subtitle?: string
  confirmLabel: string
  reasons: ModReason[]
  busy?: boolean
  onCancel: () => void
  /** Подтверждение: выбранная причина (label) + итоговое сообщение. */
  onConfirm: (reason: string, message: string) => void
}

/**
 * Модалка выбора причины модерации (блокировка аккаунта / удаление контента).
 * При выборе причины сообщение подставляется автоматически — его можно отредактировать.
 * Рендерится внутри админского шелла (для CSS-переменных --a-*), без портала.
 */
export function ModerationReasonModal({
  title,
  subtitle,
  confirmLabel,
  reasons,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  const [reasonKey, setReasonKey] = useState(reasons[0]?.key ?? '')
  const [message, setMessage] = useState(reasons[0]?.message ?? '')

  // Esc — закрыть.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const pickReason = (key: string) => {
    setReasonKey(key)
    const r = reasons.find((x) => x.key === key)
    if (r) setMessage(r.message)
  }

  const submit = () => {
    const r = reasons.find((x) => x.key === reasonKey)
    onConfirm(r?.label ?? '', message.trim())
  }

  return (
    <div className={s.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={s.modal} role="dialog" aria-modal="true">
        <div className={s.modalHead}>
          <div>
            <div className={s.modalTitle}>{title}</div>
            {subtitle && <div className={s.modalSub}>{subtitle}</div>}
          </div>
          <button className={`${s.btn} ${s.btnIcon}`} onClick={onCancel} aria-label="Закрыть">
            <Ic.x />
          </button>
        </div>

        <div className={s.modalBody}>
          <div>
            <div className={s.detailLabel}>Причина</div>
            <select className={s.select} value={reasonKey} onChange={(e) => pickReason(e.target.value)} style={{ width: '100%' }}>
              {reasons.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className={s.detailLabel}>Сообщение (увидит пользователь)</div>
            <textarea
              className={s.commentArea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Текст уведомления…"
            />
          </div>
        </div>

        <div className={s.modalFoot}>
          <button className={s.btn} onClick={onCancel} disabled={busy}>
            Отмена
          </button>
          <button className={`${s.btn} ${s.btnDanger}`} onClick={submit} disabled={busy || !message.trim()}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
