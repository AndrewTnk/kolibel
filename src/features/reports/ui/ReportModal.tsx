import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { reportUiActions } from '../model/reportUiSlice'
import { submitReport, REPORT_REASONS } from '../lib/reportApi'
import { loadConversations } from '../../chat/model/chatThunks'
import type { ReportTargetType } from '../model/types'
import { Select } from '../../../shared/ui/Select/Select'
import s from './ReportModal.module.css'

const REASON_OPTIONS = REPORT_REASONS.map((r) => ({ value: r, label: r }))

const TARGET_NOUN: Record<ReportTargetType, string> = {
  post: 'публикацию',
  comment: 'комментарий',
  vacancy: 'вакансию',
  user: 'пользователя',
  company: 'компанию',
  message: 'сообщение',
}

const MAX_LEN = 1000
const MAX_EVIDENCE = 6

/**
 * Глобальная модалка подачи жалобы. Открывается из любого источника через
 * reportUiActions.openReport({ type, id, title }). Смонтирована один раз в RootLayout.
 */
export function ReportModal() {
  const dispatch = useAppDispatch()
  const target = useAppSelector((st) => st.reportUi.target)

  const [reason, setReason] = useState<string>(REPORT_REASONS[0])
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // Сброс при открытии новой цели
  useEffect(() => {
    if (target) {
      setReason(REPORT_REASONS[0])
      setText('')
      setFiles([])
      setError(null)
      setDone(false)
      setBusy(false)
    }
  }, [target])

  // Превью прикреплённых картинок (создаём/отзываем object URL только при смене набора)
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  // Esc закрывает
  useEffect(() => {
    if (!target) return
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
  }, [target])

  if (!target) return null

  const close = () => dispatch(reportUiActions.closeReport())

  const onPickFiles = (list: FileList | null) => {
    if (!list) return
    const imgs = Array.from(list).filter((f) => f.type.startsWith('image/'))
    setFiles((prev) => [...prev, ...imgs].slice(0, MAX_EVIDENCE))
  }

  const submit = async () => {
    if (!text.trim()) {
      setError('Опишите, что не так')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await submitReport({ target, reason, description: text, evidence: files })
      // Карточка жалобы уже создана в чате «Поддержка Kolibel» — подтянем её сразу.
      void dispatch(loadConversations())
      setDone(true)
      setTimeout(close, 1400)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить жалобу')
      setBusy(false)
    }
  }

  return createPortal(
    <div className={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={s.modal} role="dialog" aria-modal="true">
        {done ? (
          <div className={s.success}>
            <div className={s.successMark}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 4 4 10-10" />
              </svg>
            </div>
            <div className={s.successTitle}>Жалоба отправлена</div>
            <div className={s.successSub}>Спасибо! Модераторы рассмотрят её.</div>
          </div>
        ) : (
          <>
            <div className={s.head}>
              <div>
                <div className={s.title}>Пожаловаться</div>
                <div className={s.sub}>
                  Жалоба на {TARGET_NOUN[target.type]}
                  {target.title ? ` «${target.title}»` : ''}
                </div>
              </div>
              <button className={s.close} onClick={close} aria-label="Закрыть">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className={s.body}>
              <div className={s.field}>
                <label className={s.label}>Причина</label>
                <Select value={reason} options={REASON_OPTIONS} onChange={setReason} ariaLabel="Причина жалобы" />
              </div>

              <div className={s.field}>
                <label className={s.label}>Что произошло</label>
                <textarea
                  className={s.textarea}
                  placeholder="Опишите проблему подробнее…"
                  value={text}
                  maxLength={MAX_LEN}
                  onChange={(e) => setText(e.target.value)}
                />
                <span className={s.counter}>
                  {text.length}/{MAX_LEN}
                </span>
              </div>

              <div className={s.field}>
                <label className={s.label}>Скриншоты (необязательно)</label>
                <div className={s.evi}>
                  {files.map((_, i) => (
                    <div key={i} className={s.thumb}>
                      <img src={previews[i]} alt="" />
                      <button
                        className={s.thumbDel}
                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        aria-label="Убрать"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {files.length < MAX_EVIDENCE && (
                    <button className={s.addEvi} onClick={() => fileRef.current?.click()} aria-label="Добавить скриншот">
                      +
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    onPickFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
                <span className={s.hint}>Например, скриншот оскорбительной переписки — поможет модератору.</span>
              </div>

              {error && <div className={s.error}>{error}</div>}

              <div className={s.foot}>
                <button className={s.btn} onClick={close} disabled={busy}>
                  Отмена
                </button>
                <button className={`${s.btn} ${s.btnPrimary}`} onClick={submit} disabled={busy}>
                  {busy ? 'Отправка…' : 'Отправить жалобу'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
