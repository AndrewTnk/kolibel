import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../../app/store/hooks'
import { markConversationRead, startConversation } from '../../chat/model/chatThunks'
import { chatUiActions } from '../../chat/model/chatUiSlice'
import { searchEntities, type SearchResults } from '../lib/searchApi'
import { CompanyBadge } from '../../../shared/ui/CompanyBadge/CompanyBadge'
import styles from './GlobalSearch.module.css'

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const empty: SearchResults = { people: [], companies: [] }

export function GlobalSearch() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchResults>(empty)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  // Закрытие по клику вне / Esc
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // Дебаунс-поиск (и подсказки на пустой строке)
  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    const t = setTimeout(() => {
      searchEntities(query)
        .then((r) => alive && setResults(r))
        .catch(() => alive && setResults(empty))
        .finally(() => alive && setLoading(false))
    }, 220)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [query, open])

  function goProfile(id: string) {
    setOpen(false)
    setQuery('')
    navigate(`/u/${id}?from=search`)
  }

  function write(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    setQuery('')
    void dispatch(startConversation(id)).then((res) => {
      if (startConversation.fulfilled.match(res) && res.payload) {
        dispatch(chatUiActions.openConversationInMini(res.payload))
        void dispatch(markConversationRead(res.payload))
      }
    })
  }

  const hasResults = results.people.length > 0 || results.companies.length > 0
  const isSearching = !!query.trim()

  return (
    <div className={styles.root} ref={ref}>
      <div className={styles.inputWrap}>
        <span className={styles.icon} aria-hidden>
          <SearchIcon />
        </span>
        <input
          className={styles.input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Поиск: люди и компании"
          aria-label="Поиск: люди и компании"
        />
      </div>

      {open ? (
        <div className={styles.dropdown} role="listbox" aria-label="Результаты поиска">
          {hasResults ? (
            <>
              {results.people.length ? (
                <div className={styles.group}>
                  <div className={styles.groupLabel}>Люди</div>
                  {results.people.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={styles.row}
                      role="option"
                      onClick={() => goProfile(p.id)}
                    >
                      {p.avatar ? (
                        <img className={styles.avatar} src={p.avatar} alt="" />
                      ) : (
                        <span className={styles.avatar} aria-hidden>
                          {p.initials}
                        </span>
                      )}
                      <span className={styles.meta}>
                        <span className={styles.nameRow}>
                          <span className={styles.name}>{p.name}</span>
                          <CompanyBadge logo={p.companyLogo} title={p.company} size={13} />
                        </span>
                        <span className={styles.sub}>{p.subtitle}</span>
                      </span>
                      <span
                        className={styles.action}
                        role="button"
                        tabIndex={-1}
                        aria-label={`Написать ${p.name}`}
                        title="Написать"
                        onClick={(e) => write(p.id, e)}
                      >
                        <ChatIcon />
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {results.companies.length ? (
                <div className={styles.group}>
                  <div className={styles.groupLabel}>Компании</div>
                  {results.companies.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={styles.row}
                      role="option"
                      onClick={() => goProfile(c.id)}
                    >
                      {c.logo ? (
                        <img className={[styles.avatar, styles.avatarSquare].join(' ')} src={c.logo} alt="" />
                      ) : (
                        <span className={[styles.avatar, styles.avatarSquare].join(' ')} aria-hidden>
                          {c.initial}
                        </span>
                      )}
                      <span className={styles.meta}>
                        <span className={styles.name}>{c.name}</span>
                        <span className={styles.sub}>{c.subtitle}</span>
                      </span>
                      <span
                        className={styles.action}
                        role="button"
                        tabIndex={-1}
                        aria-label={`Написать ${c.name}`}
                        title="Написать"
                        onClick={(e) => write(c.id, e)}
                      >
                        <ChatIcon />
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className={styles.empty}>
              {loading
                ? 'Поиск…'
                : isSearching
                  ? `Ничего не найдено по запросу «${query.trim()}»`
                  : 'Начните вводить имя или название'}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
