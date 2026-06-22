import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { loadConversations, sendMessage } from '../model/chatThunks'
import type { ChatAttach } from '../model/types'
import { ChatAvatar } from './ChatAvatar'
import { ChatIco } from './chatIcons'
import styles from './Chat.module.css'

/** Содержимое, которое отправляем выбранным собеседникам. */
export type ShareMessage = {
  text?: string
  attach?: ChatAttach | null
}

/**
 * Универсальный пикер «Отправить в чат»: список существующих бесед с поиском
 * и множественным выбором. По «Отправить» рассылает одно и то же сообщение
 * (текст и/или вложение) во все выбранные беседы. Используется для шеринга
 * профиля (ссылка текстом), поста и вакансии (вложения-карточки).
 */
export function ShareToChatModal({
  message,
  title = 'Отправить в чат',
  onClose,
  onSent,
}: {
  message: ShareMessage
  title?: string
  onClose: () => void
  onSent?: (count: number) => void
}) {
  const dispatch = useAppDispatch()
  const conversations = useAppSelector((s) => s.chat.conversations)
  const status = useAppSelector((s) => s.chat.status)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  useEffect(() => {
    if (status === 'idle') void dispatch(loadConversations())
  }, [status, dispatch])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Только беседы с перепиской (как в списке чатов), новые сверху.
  const list = useMemo(
    () =>
      [...conversations]
        .filter((c) => c.messages.length > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  )

  const query = q.trim().toLowerCase()
  const filtered = query
    ? list.filter((c) => `${c.title} ${c.company ?? ''}`.toLowerCase().includes(query))
    : list

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function send() {
    if (!selected.size || sending) return
    setSending(true)
    try {
      await Promise.all(
        [...selected].map((conversationId) =>
          dispatch(
            sendMessage({
              conversationId,
              text: message.text ?? '',
              attach: message.attach ?? null,
            }),
          ),
        ),
      )
      const n = selected.size
      onSent?.(n)
      setDone(n)
      window.setTimeout(onClose, 1100)
    } finally {
      setSending(false)
    }
  }

  function plural(n: number) {
    const m10 = n % 10
    const m100 = n % 100
    if (m10 === 1 && m100 !== 11) return 'чат'
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'чата'
    return 'чатов'
  }

  return createPortal(
    <div className={[styles.scrim, styles.shareScrim].join(' ')} onClick={onClose} role="dialog" aria-modal>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.mHead}>
          <div className={styles.mTitle}>{title}</div>
          <button className={styles.mClose} onClick={onClose} aria-label="Закрыть">
            <ChatIco.close />
          </button>
        </div>
        {done !== null ? (
          <div className={styles.shareDone}>
            <span className={styles.shareDoneIco}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <div className={styles.shareDoneText}>
              Отправлено в {done} {plural(done)}
            </div>
          </div>
        ) : (
        <div className={styles.mBody}>
          <div className={styles.modalSearch}>
            <ChatIco.search />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по чатам"
              autoFocus
            />
          </div>
          <div className={styles.contactList}>
            {filtered.length ? (
              filtered.map((c) => {
                const on = selected.has(c.id)
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={[styles.contactRow, on ? styles.shareRowOn : ''].filter(Boolean).join(' ')}
                    onClick={() => toggle(c.id)}
                    aria-pressed={on}
                  >
                    <ChatAvatar
                      name={c.title}
                      avatar={c.avatar}
                      square={c.type === 'company'}
                      size={44}
                      id={c.type === 'company' ? undefined : c.otherId}
                    />
                    <div className={styles.cMeta}>
                      <div className={styles.cName}>{c.title}</div>
                      {c.company ? <div className={styles.cRole}>{c.company}</div> : null}
                    </div>
                    <span className={[styles.shareCheck, on ? styles.shareCheckOn : ''].filter(Boolean).join(' ')} aria-hidden>
                      {on ? (
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </span>
                  </button>
                )
              })
            ) : (
              <div className={styles.modalEmpty}>
                {list.length ? 'Ничего не нашли' : 'У тебя пока нет активных чатов'}
              </div>
            )}
          </div>
        </div>
        )}
        {done === null ? (
          <div className={styles.shareFoot}>
            <button
              type="button"
              className={styles.shareSend}
              onClick={send}
              disabled={!selected.size || sending}
            >
              <ChatIco.send />
              {sending ? 'Отправляем…' : selected.size ? `Отправить (${selected.size})` : 'Выбери чат'}
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
