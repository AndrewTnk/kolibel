import { useNavigate } from 'react-router-dom'
import { ChatAvatar } from './ChatAvatar'
import type { SharedProfile } from '../model/types'
import styles from './Chat.module.css'

/**
 * Пересланный профиль — мини-карточка (баннер + аватар + имя + роль), как во
 * вкладке «Сеть». Кликабельна → профиль `/u/:id` (профили открываются, в отличие
 * от постов).
 */
export function SharedProfileCard({ profile }: { profile: SharedProfile }) {
  const navigate = useNavigate()
  return (
    <button type="button" className={styles.sharedProfile} onClick={() => navigate(`/u/${profile.id}`)}>
      <span
        className={styles.spfBanner}
        style={profile.banner ? { backgroundImage: `url(${profile.banner})` } : undefined}
      />
      <span className={styles.spfAva}>
        <ChatAvatar name={profile.name} avatar={profile.avatar} square={profile.isCompany} size={56} />
      </span>
      <span className={styles.spfBody}>
        <span className={styles.spfName}>{profile.name}</span>
        {profile.role ? <span className={styles.spfRole}>{profile.role}</span> : null}
        {profile.location ? <span className={styles.spfLoc}>{profile.location}</span> : null}
      </span>
    </button>
  )
}
