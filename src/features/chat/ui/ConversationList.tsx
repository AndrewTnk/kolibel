import { useMemo, useState } from 'react'
import type { ChatConversation } from '../model/types'
import { formatChatTime, lastMessagePreview } from '../lib/format'
import { BlockSkeleton } from '../../../shared/ui/Skeleton/Skeleton'
import { ChatAvatar } from './ChatAvatar'
import { ChatIco } from './chatIcons'
import { CompanyBadge } from '../../../shared/ui/CompanyBadge/CompanyBadge'
import styles from './Chat.module.css'

type Tab = 'all' | 'unread'

type Props = {
  conversations: ChatConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNewChat?: () => void
  loading?: boolean
}

function sortConvs(list: ChatConversation[]): ChatConversation[] {
  return [...list].sort((a, b) => {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1
    const at = a.messages.length ? a.messages[a.messages.length - 1].createdAt : a.updatedAt
    const bt = b.messages.length ? b.messages[b.messages.length - 1].createdAt : b.updatedAt
    return bt - at
  })
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  loading = false,
}: Props) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('all')

  const unreadConvCount = conversations.filter((c) => (c.unreadCount ?? 0) > 0).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const withMessages = conversations.filter((c) => c.messages.length > 0)
    const byTab = withMessages.filter((c) => (tab === 'unread' ? (c.unreadCount ?? 0) > 0 : true))
    const byQuery = q
      ? byTab.filter((c) =>
          `${c.title} ${c.subtitle ?? ''} ${c.messages.map((m) => m.text).join(' ')}`
            .toLowerCase()
            .includes(q),
        )
      : byTab
    return sortConvs(byQuery)
  }, [conversations, query, tab])

  return (
    <div className={styles.listCol}>
      <div className={styles.listHead}>
        <div className={styles.listHeadTop}>
          <div className={styles.listTitle}>Чаты</div>
          {onNewChat ? (
            <button type="button" className={styles.newChatBtn} onClick={onNewChat}>
              <ChatIco.plus /> Новый
            </button>
          ) : null}
        </div>
        <div className={styles.listSearch}>
          <ChatIco.search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по чатам и сообщениям"
            type="search"
          />
        </div>
      </div>

      <div className={styles.listTabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'all'}
          className={[styles.listTab, tab === 'all' ? styles.listTabOn : ''].join(' ')}
          onClick={() => setTab('all')}
        >
          Все
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'unread'}
          className={[styles.listTab, tab === 'unread' ? styles.listTabOn : ''].join(' ')}
          onClick={() => setTab('unread')}
        >
          Непрочит.
          {unreadConvCount > 0 ? <span className={styles.pill}>{unreadConvCount}</span> : null}
        </button>
      </div>

      <div className={styles.list} role="listbox" aria-label="Чаты">
        {loading && !filtered.length ? (
          <div style={{ display: 'grid', gap: 8, padding: 8 }}>
            {Array.from({ length: 7 }, (_, i) => (
              <BlockSkeleton key={i} height={60} radius={12} />
            ))}
          </div>
        ) : filtered.length ? (
          filtered.map((c) => {
            const last = c.messages[c.messages.length - 1]
            const isMe = last?.sender === 'me'
            return (
              <div
                key={c.id}
                role="option"
                tabIndex={0}
                aria-selected={activeId === c.id}
                className={[styles.listRow, activeId === c.id ? styles.listRowOn : ''].join(' ')}
                onClick={() => onSelect(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(c.id)
                  }
                }}
              >
                <ChatAvatar name={c.title} avatar={c.avatar} size={46} square={c.type === 'company'} />
                <div className={styles.lMeta}>
                  <div className={styles.lTop}>
                    <div className={styles.lName}>
                      <span className={styles.lNameText}>{c.title}</span>
                      <CompanyBadge logo={c.companyLogo} title={c.company} size={13} />
                      {c.pinned ? (
                        <span className={styles.pinIc} title="Закреплён">
                          <ChatIco.pin width={12} height={12} />
                        </span>
                      ) : null}
                    </div>
                    {last ? <div className={styles.lTime}>{formatChatTime(last.createdAt)}</div> : null}
                  </div>
                  <div className={styles.lBottom}>
                    <div className={styles.lPreview}>
                      {isMe ? (
                        <span
                          className={[styles.lReadIc, last.readAt ? styles.lReadIcRead : ''].join(' ')}
                        >
                          {last.readAt ? (
                            <ChatIco.check2 width={14} height={11} />
                          ) : (
                            <ChatIco.check1 width={13} height={10} />
                          )}
                        </span>
                      ) : null}
                      {isMe ? 'Вы: ' : ''}
                      {last ? lastMessagePreview(last.text || last.attach?.title || '', 38) : 'Нет сообщений'}
                    </div>
                    {c.muted ? (
                      <span className={styles.lMuteIc} title="Без звука">
                        <ChatIco.mute width={13} height={13} />
                      </span>
                    ) : null}
                    {c.unreadCount ? (
                      <span className={[styles.lBadge, c.muted ? styles.lBadgeMuted : ''].join(' ')}>
                        {c.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className={styles.listEmpty}>
            {tab === 'unread' ? 'Нет непрочитанных' : 'Ничего не найдено'}
          </div>
        )}
      </div>
    </div>
  )
}
