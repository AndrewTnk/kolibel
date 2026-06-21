import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { useIsMobile } from '../../../shared/lib/useMediaQuery'
import { markConversationRead, sendMessage } from '../model/chatThunks'
import { chatUiActions } from '../model/chatUiSlice'
import { dayKey, formatDaySeparator, formatMessageTime, formatChatTime, lastMessagePreview } from '../lib/format'
import { useChatAttach } from '../lib/useChatAttach'
import { ChatAvatar } from './ChatAvatar'
import { ChatAttachView } from './ChatAttachView'
import { ChatIco } from './chatIcons'
import styles from './Chat.module.css'

const EMOJI_SET = ['😀', '😂', '😍', '😎', '🤔', '🙏', '👍', '👏', '🔥', '✨', '💯', '🎉', '❤️', '💪', '✅', '🚀', '📌', '💬', '🤝', '😅', '😉', '😇', '🥳', '🤩']

export function MiniChatWidget() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isMobile = useIsMobile()
  const open = useAppSelector((s) => s.chatUi.miniOpen)
  const view = useAppSelector((s) => s.chatUi.miniView)
  const activeId = useAppSelector((s) => s.chatUi.activeConversationId)
  const conversations = useAppSelector((s) => s.chat.conversations)

  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [attachOpen, setAttachOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
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

  // Закрытие поповеров вложений/эмодзи по клику-вне и Esc.
  useEffect(() => {
    function onDocClick() {
      setAttachOpen(false)
      setEmojiOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAttachOpen(false)
        setEmojiOpen(false)
      }
    }
    window.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // Вложения (фото/видео/документ в Storage + вакансия) — общий с большим чатом хук.
  const att = useChatAttach((text, attach) => {
    if (!active) return
    void dispatch(sendMessage({ conversationId: active.id, text, attach }))
    setAttachOpen(false)
  })

  // Ранний выход — строго после всех хуков. На самой странице чата мини-чат не нужен.
  if (isMobile || pathname.startsWith('/chat')) return null

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
  // Юзер: фото и документ. Компания: + вакансия (своя). Гео/контакт убраны.
  const ATTACH_ITEMS: { icon: keyof typeof ChatIco; label: string; run: () => void }[] = [
    { icon: 'photo', label: 'Фото или видео', run: () => { att.pickPhoto(); setAttachOpen(false) } },
    { icon: 'doc', label: 'Документ', run: () => { att.pickDoc(); setAttachOpen(false) } },
    ...(att.isCompany ? [{ icon: 'briefcase' as const, label: 'Вакансия', run: () => att.setAttachMode('vacancy') }] : []),
  ]
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
                {active.otherId ? (
                  <Link to={`/u/${active.otherId}`} className={styles.threadAvatarLink} aria-label={active.title}>
                    <ChatAvatar name={active.title} avatar={active.avatar} size={34} square={active.type === 'company'} />
                  </Link>
                ) : (
                  <ChatAvatar name={active.title} avatar={active.avatar} size={34} square={active.type === 'company'} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {active.otherId ? (
                    <Link to={`/u/${active.otherId}`} className={[styles.miniThreadName, styles.threadTitleLink].join(' ')}>
                      {active.title}
                    </Link>
                  ) : (
                    <div className={styles.miniThreadName}>{active.title}</div>
                  )}
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
                            {m.attach ? <ChatAttachView attach={m.attach} /> : null}
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
                <div className={styles.composerInner} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={styles.composerBtn}
                    title="Прикрепить"
                    aria-label="Прикрепить"
                    onClick={() => {
                      setAttachOpen((v) => !v)
                      setEmojiOpen(false)
                      att.setAttachMode('main')
                    }}
                  >
                    <ChatIco.attach />
                  </button>
                  <input ref={att.fileRef} type="file" hidden onChange={att.onFileChange} />
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
                  <button
                    type="button"
                    className={styles.composerBtn}
                    title="Эмодзи"
                    aria-label="Эмодзи"
                    onClick={() => {
                      setEmojiOpen((v) => !v)
                      setAttachOpen(false)
                    }}
                  >
                    <ChatIco.smile />
                  </button>

                  {attachOpen ? (
                    <div className={styles.attachPop} onClick={(e) => e.stopPropagation()}>
                      {att.attachMode === 'vacancy' ? (
                        <>
                          <button type="button" className={styles.attachBack} onClick={() => att.setAttachMode('main')}>
                            ‹ Вакансия
                          </button>
                          {att.vacancies.length ? (
                            att.vacancies.map((v) => (
                              <button
                                type="button"
                                key={v.id}
                                className={styles.attachItem}
                                onClick={() => {
                                  att.sendVacancy(v)
                                  setAttachOpen(false)
                                }}
                              >
                                {v.title}
                              </button>
                            ))
                          ) : (
                            <div className={styles.attachEmpty}>Нет вакансий</div>
                          )}
                        </>
                      ) : (
                        ATTACH_ITEMS.map((it) => {
                          const Icon = ChatIco[it.icon]
                          return (
                            <button type="button" key={it.label} className={styles.attachItem} onClick={it.run}>
                              <span className={styles.ic}>
                                <Icon />
                              </span>
                              {it.label}
                            </button>
                          )
                        })
                      )}
                    </div>
                  ) : null}

                  {emojiOpen ? (
                    <div className={styles.emojiPop} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.emojiPopTitle}>Часто используемые</div>
                      <div className={styles.emojiGrid}>
                        {EMOJI_SET.map((em) => (
                          <button type="button" key={em} onClick={() => setDraft((t) => t + em)}>
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
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
