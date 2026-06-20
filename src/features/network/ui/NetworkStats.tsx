import styles from './NetworkStats.module.css'

export type NetworkStatKind = 'following' | 'followers'

type Props = {
  onOpen: (kind: NetworkStatKind) => void
  followingPeople: number
  followingCompanies: number
  followers: number
  /** Встроенный режим: без карточки и заголовка «Моя сеть» (внутри блока графа). */
  embedded?: boolean
}

export function NetworkStats({
  onOpen,
  followingPeople,
  followingCompanies,
  followers,
  embedded = false,
}: Props) {
  // Подписки = люди + компании (без разделения)
  const stats: { kind: NetworkStatKind; label: string; count: number }[] = [
    { kind: 'following', label: 'подписки', count: followingPeople + followingCompanies },
    { kind: 'followers', label: 'подписчики', count: followers },
  ]

  const row = (
    <div className={styles.stats}>
      {stats.map((s) => (
        <button key={s.kind} type="button" className={styles.stat} onClick={() => onOpen(s.kind)}>
          <span className={styles.count}>{s.count}</span>
          <span className={styles.label}>{s.label}</span>
        </button>
      ))}
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
