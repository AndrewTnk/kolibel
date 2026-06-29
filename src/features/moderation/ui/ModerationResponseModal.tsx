import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { moderationUiActions } from '../model/moderationUiSlice'
import {
  fetchModerationResponse,
  RESPONSE_TEXT,
  RESPONSE_TITLE,
  OFFENDER_TEXT,
  OFFENDER_TITLE,
} from '../lib/moderationApi'
import type { ModerationResponse } from '../model/types'
import s from './ModerationResponseModal.module.css'

/**
 * Модалка с ответом модерации автору жалобы. Открывается по клику на уведомление
 * kind 'moderation' (через moderationUiActions.openModerationResponse(responseId)).
 * Смонтирована один раз в RootLayout.
 */
export function ModerationResponseModal() {
  const dispatch = useAppDispatch()
  const id = useAppSelector((st) => st.moderationUi.responseId)
  const [data, setData] = useState<ModerationResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const close = () => dispatch(moderationUiActions.closeModerationResponse())

  useEffect(() => {
    if (!id) {
      setData(null)
      return
    }
    let alive = true
    setLoading(true)
    fetchModerationResponse(id)
      .then((r) => alive && setData(r))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!id) return null

  // Аудитория: ответ автору жалобы (report_result) ИЛИ уведомление нарушителю.
  const isReport = !data || data.kind === 'report_result'
  // «ОК»-вид (зелёный) только у положительного ответа автору жалобы; всё остальное — красный.
  const ok = isReport && data?.resolution !== 'reject'
  const eyebrow = isReport ? 'Ответ модерации' : 'Уведомление модерации'
  const verdictTitle = data
    ? isReport
      ? RESPONSE_TITLE[data.resolution]
      : OFFENDER_TITLE[data.kind as Exclude<typeof data.kind, 'report_result'>]
    : ''
  const verdictText = data
    ? isReport
      ? RESPONSE_TEXT[data.resolution]
      : OFFENDER_TEXT[data.kind as Exclude<typeof data.kind, 'report_result'>]
    : ''

  return createPortal(
    <div className={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={s.modal} role="dialog" aria-modal="true">
        <div className={s.head}>
          <div>
            <div className={s.eyebrow}>{eyebrow}</div>
            <div className={s.title}>{data?.category || 'Ваша жалоба'}</div>
          </div>
          <button className={s.close} onClick={close} aria-label="Закрыть">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className={s.state}>Загрузка…</div>
        ) : !data ? (
          <div className={s.state}>Ответ не найден</div>
        ) : (
          <div className={s.body}>
            <div className={`${s.verdict} ${ok ? s.verdictOk : s.verdictReject}`}>
              {ok ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 4 4 10-10" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9 9l6 6M15 9l-6 6" />
                </svg>
              )}
              {verdictTitle}
            </div>

            <div className={s.section}>
              <div className={s.label}>{isReport ? 'Ответ' : 'Сообщение'}</div>
              <div className={s.text}>{verdictText}</div>
            </div>

            {!isReport && data.reason.trim() ? (
              <div className={s.section}>
                <div className={s.label}>Причина</div>
                <div className={s.text}>{data.reason}</div>
              </div>
            ) : null}

            {data.comment.trim() ? (
              <div className={s.section}>
                <div className={s.label}>Комментарий модерации</div>
                <div className={s.comment}>{data.comment}</div>
              </div>
            ) : null}

            <div className={s.foot}>
              <button className={s.btn} onClick={close}>
                Понятно
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
