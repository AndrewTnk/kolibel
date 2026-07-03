import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { supportUiActions } from '../model/supportUiSlice'
import {
  DISCUSSION_CATEGORIES,
  discussionCategoryLabel,
  type Discussion,
  type DiscussionCategory,
  type DiscussionMessage,
} from '../model/types'
import {
  createDiscussion,
  fetchDiscussionMessages,
  fetchMyDiscussions,
  sendDiscussionMessage,
} from '../lib/supportApi'
import s from './SupportModal.module.css'

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

function fmtDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

type View = 'list' | 'new' | 'thread'

const SUBJECT_LIMIT = 80
const BODY_LIMIT = 2000

/**
 * Модалка «Поддержка» (обращения): список моих обращений → форма нового /
 * переписка с поддержкой. Смонтирована в App.tsx ВНЕ роутера (никаких <Link>!),
 * z-index выше BlockedScreen — заблокированный может оспорить блокировку.
 * Без realtime: обновление при открытии + кнопка «Обновить»; о новом ответе
 * сообщает уведомление (kind 'support').
 */
export function SupportModal() {
  const dispatch = useAppDispatch()
  const open = useAppSelector((st) => st.supportUi.open)
  const activeId = useAppSelector((st) => st.supportUi.activeId)
  const preset = useAppSelector((st) => st.supportUi.preset)

  const [view, setView] = useState<View>('list')
  const [list, setList] = useState<Discussion[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DiscussionMessage[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Форма нового обращения
  const [category, setCategory] = useState<DiscussionCategory>('question')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  // Композер треда
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const scrollRef = useRef<HTMLDivElement | null>(null)

  const close = () => dispatch(supportUiActions.closeSupport())

  const loadList = async () => {
    setListLoading(true)
    try {
      setList(await fetchMyDiscussions())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить обращения')
    } finally {
      setListLoading(false)
    }
  }

  const loadMessages = async (id: string) => {
    setMsgLoading(true)
    try {
      setMessages(await fetchDiscussionMessages(id))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить переписку')
    } finally {
      setMsgLoading(false)
    }
  }

  const openThread = (id: string) => {
    setThreadId(id)
    setMessages([])
    setDraft('')
    setView('thread')
    void loadMessages(id)
  }

  // Инициализация при каждом открытии модалки.
  useEffect(() => {
    if (!open) return
    setError(null)
    setSubject('')
    setBody('')
    setDraft('')
    setCategory(preset ?? 'question')
    void loadList()
    if (activeId) {
      openThread(activeId)
    } else {
      setView(preset ? 'new' : 'list')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Скролл переписки вниз при загрузке/новом сообщении.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, view])

  // Esc + блокировка скролла body, пока модалка открыта.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch(supportUiActions.closeSupport())
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, dispatch])

  if (!open) return null

  const thread = threadId ? list.find((d) => d.id === threadId) ?? null : null

  const submitNew = async () => {
    if (!subject.trim() || !body.trim() || busy) return
    setBusy(true)
    try {
      const id = await createDiscussion(category, subject, body)
      setSubject('')
      setBody('')
      await loadList()
      openThread(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить обращение')
    } finally {
      setBusy(false)
    }
  }

  const submitMessage = async () => {
    if (!threadId || !draft.trim() || busy) return
    setBusy(true)
    try {
      await sendDiscussionMessage(threadId, draft)
      setDraft('')
      await loadMessages(threadId)
      void loadList()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить сообщение')
    } finally {
      setBusy(false)
    }
  }

  const statusBadge = (d: Discussion) => {
    if (d.status === 'closed') return <span className={[s.badge, s.badgeClosed].join(' ')}>Закрыто</span>
    if (d.lastSender === 'staff') return <span className={[s.badge, s.badgeAnswered].join(' ')}>Есть ответ</span>
    return <span className={[s.badge, s.badgeOpen].join(' ')}>Открыто</span>
  }

  const title =
    view === 'new' ? 'Новое обращение' : view === 'thread' ? thread?.subject || 'Обращение' : 'Поддержка'

  return createPortal(
    <div className={s.overlay} onClick={close} role="dialog" aria-modal aria-label="Поддержка">
      <div className={s.panel} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          {view !== 'list' ? (
            <button type="button" className={s.backBtn} onClick={() => setView('list')} aria-label="Назад к списку">
              ←
            </button>
          ) : null}
          <div className={s.headTitle}>
            <div className={s.title}>{title}</div>
            {view === 'thread' && thread ? (
              <div className={s.subTitle}>
                {discussionCategoryLabel(thread.category)} · #{thread.id.slice(0, 8)}
              </div>
            ) : null}
          </div>
          {view === 'thread' && threadId ? (
            <button
              type="button"
              className={s.refreshBtn}
              title="Обновить переписку"
              onClick={() => {
                void loadMessages(threadId)
                void loadList()
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
          ) : null}
          <button type="button" className={s.closeBtn} onClick={close} aria-label="Закрыть">
            ✕
          </button>
        </div>

        {error ? <div className={s.error}>{error}</div> : null}

        {view === 'list' ? (
          <div className={s.body}>
            <div className={s.listHint}>
              Вопрос, проблема или несогласие с решением модерации — напиши нам, ответим здесь и пришлём
              уведомление.
            </div>
            <div className={s.list}>
              {listLoading && list.length === 0 ? <div className={s.emptyNote}>Загрузка…</div> : null}
              {!listLoading && list.length === 0 ? (
                <div className={s.emptyNote}>Обращений пока нет.</div>
              ) : null}
              {list.map((d) => (
                <button key={d.id} type="button" className={s.row} onClick={() => openThread(d.id)}>
                  <div className={s.rowMain}>
                    <div className={s.rowCat}>{discussionCategoryLabel(d.category)}</div>
                    <div className={s.rowSubject}>{d.subject || 'Без темы'}</div>
                    <div className={s.rowDate}>{fmtDate(d.lastMessageAt)}</div>
                  </div>
                  {statusBadge(d)}
                </button>
              ))}
            </div>
            <button type="button" className={s.primaryBtn} onClick={() => setView('new')}>
              + Новое обращение
            </button>
          </div>
        ) : null}

        {view === 'new' ? (
          <div className={s.body}>
            <div className={s.label}>Категория</div>
            <div className={s.chips}>
              {DISCUSSION_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={[s.chip, category === c.key ? s.chipOn : ''].join(' ')}
                  onClick={() => setCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className={s.label}>
              Тема <span className={s.count}>{subject.length}/{SUBJECT_LIMIT}</span>
            </div>
            <input
              className={s.input}
              value={subject}
              maxLength={SUBJECT_LIMIT}
              placeholder="Коротко, о чём обращение"
              onChange={(e) => setSubject(e.target.value)}
            />
            <div className={s.label}>
              Сообщение <span className={s.count}>{body.length}/{BODY_LIMIT}</span>
            </div>
            <textarea
              className={s.textarea}
              value={body}
              maxLength={BODY_LIMIT}
              rows={6}
              placeholder="Опиши ситуацию как можно подробнее"
              onChange={(e) => setBody(e.target.value)}
            />
            <button
              type="button"
              className={s.primaryBtn}
              disabled={!subject.trim() || !body.trim() || busy}
              onClick={() => void submitNew()}
            >
              {busy ? 'Отправляем…' : 'Отправить обращение'}
            </button>
          </div>
        ) : null}

        {view === 'thread' ? (
          <div className={s.threadBody}>
            <div className={s.messages} ref={scrollRef}>
              {msgLoading && messages.length === 0 ? <div className={s.emptyNote}>Загрузка…</div> : null}
              {messages.map((m) => (
                <div key={m.id} className={[s.msgRow, m.kind === 'user' ? s.msgRowMine : ''].join(' ')}>
                  {m.kind === 'staff' ? (
                    <span className={s.staffAva} aria-hidden>
                      <img src="/logo/kolibel-mark.png" alt="" />
                    </span>
                  ) : null}
                  <div className={[s.bubble, m.kind === 'user' ? s.bubbleMine : s.bubbleStaff].join(' ')}>
                    {m.kind === 'staff' ? <div className={s.staffName}>Поддержка Kolibel</div> : null}
                    <div className={s.msgText}>{m.body}</div>
                    <div className={s.msgTime}>
                      {fmtDate(m.createdAt)}, {fmtTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {thread?.status === 'closed' ? (
              <div className={s.closedNote}>
                Обращение закрыто. Если вопрос остался — создай новое обращение.
              </div>
            ) : (
              <div className={s.composer}>
                <textarea
                  className={s.composerInput}
                  value={draft}
                  rows={2}
                  maxLength={BODY_LIMIT}
                  placeholder="Написать сообщение…"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void submitMessage()
                    }
                  }}
                />
                <button
                  type="button"
                  className={s.sendBtn}
                  disabled={!draft.trim() || busy}
                  onClick={() => void submitMessage()}
                  aria-label="Отправить"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2 11 13" />
                    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
