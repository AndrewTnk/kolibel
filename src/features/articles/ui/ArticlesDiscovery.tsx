import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { HScroll } from '../../../shared/ui/HScroll/HScroll'
import { loadAllArticles } from '../model/articleThunks'
import { rankArticlesDaily } from '../lib/rankArticles'
import { formatArticleDateShort, formatViews } from '../lib/articleFormat'
import card from './ArticlesBlock.module.css'
import s from './ArticlesDiscovery.module.css'

/** Сколько статей показываем в ленте (видно ~5, остальное под скроллом). */
const MAX_ITEMS = 12

/**
 * Общая лента статей: все опубликованные статьи пользователей и компаний,
 * отсортированные лёгким дневным ранжиром (`rankArticlesDaily`). Сверху — поиск
 * по заголовку (раскрывается по иконке).
 *
 * `variant`:
 *  - `rail` (по умолчанию) — вертикальный блок в сайдбаре главной (десктоп);
 *  - `carousel` — горизонтальная карусель сверху ленты (мобилка).
 */
export function ArticlesDiscovery({ variant = 'rail' }: { variant?: 'rail' | 'carousel' }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const all = useAppSelector((st) => st.articles.all)
  const status = useAppSelector((st) => st.articles.allStatus)

  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'idle') void dispatch(loadAllArticles())
  }, [status, dispatch])

  // Дневной ранжир (порядок стабилен в течение суток, обновляется раз в день).
  const ranked = useMemo(() => rankArticlesDaily(all), [all])

  const q = query.trim().toLowerCase()
  const list = q
    ? ranked.filter((a) => a.title.toLowerCase().includes(q))
    : ranked.slice(0, MAX_ITEMS)

  function toggleSearch() {
    setSearchOpen((open) => {
      const next = !open
      if (next) requestAnimationFrame(() => inputRef.current?.focus())
      else setQuery('')
      return next
    })
  }

  const head = (
    <div className={s.head}>
      <span className={s.label}>Рекомендуем почитать</span>
      <div className={s.search}>
        <input
          ref={inputRef}
          className={s.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') toggleSearch()
          }}
          placeholder="Поиск по названию"
          aria-label="Поиск статей по названию"
          tabIndex={searchOpen ? 0 : -1}
        />
        <button
          type="button"
          className={[s.searchBtn, searchOpen ? s.searchOn : ''].filter(Boolean).join(' ')}
          onClick={toggleSearch}
          aria-label={searchOpen ? 'Закрыть поиск' : 'Искать статьи'}
          title="Поиск статей"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>
    </div>
  )

  const loadingEmpty = status === 'loading' && all.length === 0
  const stateText = q ? 'Ничего не найдено.' : 'Пока нет статей.'

  // ── Карусель (мобилка) ──
  if (variant === 'carousel') {
    return (
      <div className={[s.carousel, searchOpen ? s.searchOpen : ''].filter(Boolean).join(' ')}>
        {head}
        {loadingEmpty ? (
          <div className={s.state}>Загружаем статьи…</div>
        ) : list.length === 0 ? (
          <div className={s.state}>{stateText}</div>
        ) : (
          <HScroll>
            {list.map((a) => (
              <button key={a.id} type="button" className={s.tile} onClick={() => navigate(`/article/${a.id}`)}>
                <span className={card.cat}>{a.category || 'Без категории'}</span>
                <span className={s.title}>{a.title}</span>
                <span className={card.meta}>
                  {formatArticleDateShort(a.publishedAt ?? a.createdAt)}
                  {' · '}
                  {formatViews(a.views)}
                </span>
              </button>
            ))}
          </HScroll>
        )}
      </div>
    )
  }

  // ── Вертикальный блок (десктоп, сайдбар) ──
  return (
    <div className={[s.card, searchOpen ? s.searchOpen : ''].filter(Boolean).join(' ')}>
      {head}
      {loadingEmpty ? (
        <div className={s.state}>Загружаем статьи…</div>
      ) : list.length === 0 ? (
        <div className={s.state}>{stateText}</div>
      ) : (
        <div className={s.scroll}>
          {list.map((a) => (
            <div key={a.id} className={s.row}>
              <button type="button" className={card.item} onClick={() => navigate(`/article/${a.id}`)}>
                <span className={card.cat}>{a.category || 'Без категории'}</span>
                <span className={s.title}>{a.title}</span>
                <span className={card.meta}>
                  {formatArticleDateShort(a.publishedAt ?? a.createdAt)}
                  {' · '}
                  {formatViews(a.views)}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
