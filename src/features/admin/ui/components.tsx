import { useState, type ReactNode } from 'react'
import s from './admin.module.css'
import { Ic } from './icons'
import { initials } from '../lib/format'
import type { EntityRef } from '../model/types'

/** Аватар с фолбэком на инициалы. Квадратный — для компаний/вакансий. */
export function Avatar({
  src,
  name,
  square,
  size = 36,
}: {
  src: string | null | undefined
  name: string
  square?: boolean
  size?: number
}) {
  const [err, setErr] = useState(false)
  const cls = `${s.avatar} ${square ? s.avatarSq : ''}`
  const style = { width: size, height: size }
  if (src && !err) {
    return <img className={cls} style={style} src={src} alt="" onError={() => setErr(true)} />
  }
  return (
    <div className={`${cls} ${s.avatarFallback}`} style={{ ...style, fontSize: size * 0.36 }}>
      {initials(name)}
    </div>
  )
}

/** Строка-сущность: аватар + имя + подпись. */
export function EntityCell({ e, sub }: { e: EntityRef | null; sub?: string }) {
  if (!e) return <span className={s.cellMuted}>—</span>
  return (
    <div className={s.entity}>
      <Avatar src={e.avatar} name={e.name} square={e.kind !== 'user'} />
      <div style={{ minWidth: 0 }}>
        <div className={s.entityName}>{e.name}</div>
        {(sub ?? e.sub) && <div className={s.entitySub}>{sub ?? e.sub}</div>}
      </div>
    </div>
  )
}

/** Цветной бейдж. */
export function Badge({ tone, children }: { tone: 'green' | 'yellow' | 'red' | 'blue' | 'gray'; children: ReactNode }) {
  const map = { green: s.badgeGreen, yellow: s.badgeYellow, red: s.badgeRed, blue: s.badgeBlue, gray: s.badgeGray }
  return <span className={`${s.badge} ${map[tone]}`}>{children}</span>
}

export function Spinner() {
  return (
    <div className={s.center}>
      <div className={s.spinner} />
    </div>
  )
}

/** Пагинация «Показано N–M из T» + кнопки страниц. */
export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  const from = page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)

  // Окно из номеров страниц (1-индексные для показа)
  const cur = page + 1
  const nums: (number | '…')[] = []
  const push = (n: number | '…') => nums.push(n)
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) push(i)
  } else {
    push(1)
    if (cur > 3) push('…')
    for (let i = Math.max(2, cur - 1); i <= Math.min(pages - 1, cur + 1); i++) push(i)
    if (cur < pages - 2) push('…')
    push(pages)
  }

  return (
    <div className={s.pager}>
      <div className={s.pagerInfo}>
        Показано {from}–{to} из {new Intl.NumberFormat('ru-RU').format(total)}
      </div>
      <div className={s.pagerBtns}>
        <button className={s.pageBtn} disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Назад">
          <Ic.chevronLeft />
        </button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className={s.pagerInfo} style={{ padding: '0 4px' }}>
              …
            </span>
          ) : (
            <button
              key={n}
              className={`${s.pageBtn} ${n - 1 === page ? s.pageBtnActive : ''}`}
              onClick={() => onPage(n - 1)}
            >
              {n}
            </button>
          ),
        )}
        <button
          className={s.pageBtn}
          disabled={page >= pages - 1}
          onClick={() => onPage(page + 1)}
          aria-label="Вперёд"
        >
          <Ic.chevronRight />
        </button>
      </div>
    </div>
  )
}
