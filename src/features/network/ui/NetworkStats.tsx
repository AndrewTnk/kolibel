import styles from './NetworkStats.module.css'

type Props = {
  /** Открыть модалку связей. */
  onOpen: () => void
  /** Всего связей (подписки + подписчики). */
  total: number
  /** Встроенный режим: без карточки и заголовка «Моя сеть» (внутри блока графа). */
  embedded?: boolean
}

/** Склонение слова «связь» по числу. */
function connectionsWord(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'связь'
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'связи'
  return 'связей'
}

/** Одна кнопка «Связи» с общим числом связей — открывает модалку списка. */
export function NetworkStats({ onOpen, total, embedded = false }: Props) {
  const row = (
    <div className={styles.stats}>
      <button type="button" className={styles.stat} onClick={onOpen}>
        <span className={styles.count}>{total}</span>
        <span className={styles.label}>{connectionsWord(total)}</span>
      </button>
    </div>
  )

  if (embedded) return row

  return (
    <div className={styles.card}>
      <div className={styles.title}>Моя сеть</div>
      {row}
    </div>
  )
}
