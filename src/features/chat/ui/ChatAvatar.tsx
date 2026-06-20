import styles from './Chat.module.css'

/** Единый «фирменный» градиент заглушки аватара (как в рекомендациях/ленте/сети). */
const AVA_GRADIENT = 'linear-gradient(135deg, #111827 0%, #334155 55%, var(--primary) 100%)'

/** Инициалы: первые буквы имени и фамилии (или названия компании). */
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

/** Аватар собеседника: фото или градиент-заглушка с инициалами.
 *  Круг — пользователь, скруглённый квадрат — компания (как во всём проекте). */
export function ChatAvatar({
  name,
  avatar,
  size = 48,
  square = false,
}: {
  name: string
  avatar?: string
  size?: number
  /** Скруглённый квадрат (для компаний) вместо круга */
  square?: boolean
}) {
  const cls = [styles.avatar, square ? styles.avatarSquare : ''].join(' ')
  const style = { width: size, height: size }
  if (avatar) {
    return <img className={cls} style={style} src={avatar} alt="" />
  }
  return (
    <span
      className={cls}
      style={{ ...style, background: AVA_GRADIENT, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  )
}
