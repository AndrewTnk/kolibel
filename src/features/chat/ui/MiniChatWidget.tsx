import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { useIsMobile } from '../../../shared/lib/useMediaQuery'
import { markConversationRead, sendMessage } from '../model/chatThunks'
import { chatUiActions } from '../model/chatUiSlice'
import { dayKey, formatDaySeparator, formatMessageTime, formatChatTime, lastMessagePreview } from '../lib/format'
import { ChatAvatar } from './ChatAvatar'
import { ChatIco } from './chatIcons'
import styles from './Chat.module.css'

export function MiniChatWidget() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const open = useAppSelector((s) => s.chatUi.miniOpen)
  const view = useAppSelector((s) => s.chatUi.miniView)
  const activeId = useAppSelector((s) => s.chatUi.activeConversationId)
  const conversations = useAppSelector((s) => s.chat.conversations)

  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const canvasRef = useRef<HTMLDivElement | null>(null)

  const active = conversations.find((c) => c.id === activeId) ?? null
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0)

  const withMessages = useMemo(
    () => conversations.filter((c) => c.messages.length > 0),
    [conversations],
  )
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? withMessages.filter((c) =>
          `${c.title} ${c.subtitle ?? ''} ${c.messages.map((m) => m.text).join(' ')}`
            .toLowerCase()
            .includes(q),
        )
      : withMessages
    return [...list].sort((a, b) => {
      const at = a.messages[a.messages.length - 1]?.createdAt ?? a.updatedAt
      const bt = b.messages[b.messages.length - 1]?.createdAt ?? b.updatedAt
      return bt - at
    })
  }, [withMessages, query])

  useLayoutEffect(() => {
    if (view === 'chat' && canvasRef.current) {
      canvasRef.current.scrollTop = canvasRef.current.scrollHeight
    }
  }, [view, activeId, active?.messages.length])

  // Ранний выход — строго после всех хуков.
  if (isMobile) return null

  function openConv(id: string) {
    dispatch(chatUiActions.openConversationInMini(id))
    void dispatch(markConversationRead(id))
  }
  function send() {
    const t = draft.trim()
    if (!t || !active) return
    void dispatch(sendMessage({ conversationId: active.id, text: t }))
    setDraft('')
  }
  function expandToPage(id?: string) {
    dispatch(chatUiActions.closeMini())
    navigate(id ? `/chat?c=${id}` : '/chat')
  }

  return createPortal(
    <div className={styles.miniRoot}>
      {open ? (
        <div className={styles.miniPanel} role="dialog" aria-label="Мини-чат">
          {view === 'list' ? (
            <>
              <div className={styles.miniHead}>
                <div className={styles.miniHeadTi}>Чаты</div>
                <div className={styles.miniHeadBtns}>
                  <button
                    type="button"
                    className={styles.miniHeadBtn}
                    title="Открыть чат на всю страницу"
                    aria-label="Развернуть"
                    onClick={() => expandToPage()}
                  >
                    <ChatIco.expand />
                  </button>
                  <button
                    type="button"
                    className={styles.miniHeadBtn}
                    aria-label="Свернуть"
                    onClick={() => dispatch(chatUiActions.closeMini())}
                  >
                    <ChatIco.close />
                  </button>
                </div>
              </div>
              <div className={styles.miniBody}>
                <div className={styles.miniListSearch}>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск по чатам…"
                    type="search"
                  />
                </div>
                <div className={styles.list}>
                  {filtered.length ? (
                    filtered.map((c) => {
                      const last = c.messages[c.messages.length - 1]
                      const isMe = last?.sender === 'me'
                      return (
                        <button type="button" key={c.id} className={styles.listRow} onClick={() => openConv(c.id)}>
                          <ChatAvatar name={c.title} avatar={c.avatar} size={42} square={c.type === 'company'} />
                          <div className={styles.lMeta}>
                            <div className={styles.lTop}>
                              <div className={styles.lName}>{c.title}</div>
                              {last ? <div className={styles.lTime}>{formatChatTime(last.createdAt)}</div> : null}
                            </div>
                            <div className={styles.lBottom}>
                              <div className={styles.lPreview}>
                                {isMe ? 'Вы: ' : ''}
                                {last ? lastMessagePreview(last.text || last.attach?.title || '', 30) : ''}
                              </div>
                              {c.unreadCount ? <span className={styles.lBadge}>{c.unreadCount}</span> : null}
                            </div>
                          </div>
                        </button>
                      )
                    })
                  ) : (
                    <div className={styles.listEmpty}>Чатов пока нет</div>
                  )}
                </div>
              </div>
            </>
          ) : active ? (
            <>
              <div className={styles.miniThreadHead}>
                <button
                  type="button"
                  className={styles.miniBackBtn}
                  onClick={() => dispatch(chatUiActions.setMiniView('list'))}
                  aria-label="Назад"
                >
                  ←
                </button>
                <ChatAvatar name={active.title} avatar={active.avatar} size={34} square={active.type === 'company'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.miniThreadName}>{active.title}</div>
                  {active.subtitle ? <div className={styles.miniThreadStatus}>{active.subtitle}</div> : null}
                </div>
                <button
                  type="button"
                  className={styles.miniExpandBtn}
                  onClick={() => expandToPage(active.id)}
                  title="Открыть на всю страницу"
                  aria-label="Развернуть"
                >
                  <ChatIco.expand />
                </button>
                <button
                  type="button"
                  className={styles.miniHeadBtn}
                  onClick={() => dispatch(chatUiActions.closeMini())}
                  aria-label="Свернуть"
                >
                  <ChatIco.close />
                </button>
              </div>
              <div className={styles.canvas} ref={canvasRef}>
                {active.messages.map((m, i) => {
                  const prev = active.messages[i - 1]
                  const next = active.messages[i + 1]
                  const showDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)
                  const tailHide =
                    !!next && next.sender === m.sender && next.createdAt - m.createdAt < 5 * 60 * 1000
                  return (
                    <div key={m.id}>
                      {showDay ? (
                        <div className={styles.daySep}>
                          <span className={styles.daySepPill}>{formatDaySeparator(m.createdAt)}</span>
                        </div>
                      ) : null}
                      <div
                        className={[
                          styles.msgRow,
                          m.sender === 'me' ? styles.msgMe : styles.msgThem,
                          tailHide ? styles.tailHide : '',
                        ].join(' ')}
                      >
                        <div className={styles.bubbleWrap}>
                          <div className={styles.bubble}>
                            {m.text ? <span className={styles.txt}>{m.text}</span> : null}
                            <span className={styles.meta}>
                              {formatMessageTime(m.createdAt)}
                              {m.sender === 'me' ? (
                                <span className={[styles.check, m.readAt ? styles.checkRead : ''].join(' ')}>
                                  {m.readAt ? (
                                    <ChatIco.check2 width={16} height={11} />
                                  ) : (
                                    <ChatIco.check1 width={14} height={11} />
                                  )}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className={styles.composer} style={{ padding: '8px 10px' }}>
                <div className={styles.composerInner}>
                  <input
                    className={styles.composerTextarea}
                    style={{ minHeight: 24 }}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        send()
                      }
                    }}
                    placeholder="Сообщение…"
                  />
                </div>
                <button type="button" className={styles.sendBtn} onClick={send} aria-label="Отправить" disabled={!draft.trim()}>
                  <ChatIco.send />
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className={styles.miniFab}
        aria-label={open ? 'Свернуть чат' : 'Открыть мини-чат'}
        onClick={() => dispatch(chatUiActions.toggleMini())}
      >
        {open ? <ChatIco.close width={22} height={22} /> : <ChatIco.chat />}
        {!open ? <span className={styles.pulse} aria-hidden /> : null}
        {!open && totalUnread > 0 ? (
          <span className={styles.miniBadge}>{totalUnread > 9 ? '9+' : totalUnread}</span>
        ) : null}
      </button>
    </div>,
    document.body,
  )
}
