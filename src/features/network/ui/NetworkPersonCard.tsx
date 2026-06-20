import { Link } from 'react-router-dom'
import { type CSSProperties, type MouseEvent } from 'react'
import type { NetworkPerson } from '../model/types'
import { CompanyBadge } from '../../../shared/ui/CompanyBadge/CompanyBadge'
import { NetIco } from './netIcons'
import { mutualLabel } from '../lib/recommend'
import styles from './NetworkPersonCard.module.css'

type Props = {
  person: NetworkPerson
  /** Детальный вид — для модалок (больше информации) */
  detailed?: boolean
  /** Если задан (и нет onOpen) — карточка кликабельна и ведёт на этот путь */
  to?: string
  /** Подписан ли я на этого человека (для кнопки в карточке-рекомендации) */
  isFollowing?: boolean
  /** Подписаться/отписаться */
  onFollow?: (id: string) => void
  /** Открыть превью-профиль (peek-модалку) */
  onOpen?: (person: NetworkPerson) => void
}

export function NetworkPersonCard({
  person,
  detailed = false,
  to,
  isFollowing = false,
  onFollow,
  onOpen,
}: Props) {
  const avatarImg = person.avatar ? (
    <img
      className={detailed ? styles.avatarLg : styles.avatar}
      style={{ objectFit: 'cover' }}
      src={person.avatar}
      alt={person.fullName}
    />
  ) : null

  if (detailed) {
    const inner = (
      <>
        <div className={styles.detHeader}>
          <div className={styles.photoWrap}>
            {avatarImg ?? (
              <div className={styles.avatarLg} aria-hidden>
                {person.avatarInitials}
              </div>
            )}
            <span
              className={[styles.onlineDot, person.isOnline ? styles.online : styles.offline].join(' ')}
              aria-hidden
            />
          </div>

          <div className={styles.detMeta}>
            <div className={styles.nameLg}>
              {person.fullName}
              <CompanyBadge logo={person.companyLogo} title={person.company} size={18} />
            </div>
            <div className={styles.jobTitleLg}>{person.jobTitle}</div>
            {person.company ? (
              <div className={styles.detCompany}>
                <span className={styles.companyLogo} aria-hidden>
                  {person.company[0]}
                </span>
                {person.company}
              </div>
            ) : null}
          </div>

          {person.tag ? <span className={styles.tag}>{person.tag}</span> : null}
        </div>

        <div className={styles.detInfoRow}>
          <span>📍 {person.location}</span>
        </div>
      </>
    )
    return to ? (
      <Link to={to} className={styles.cardDetailed}>
        {inner}
      </Link>
    ) : (
      <div className={styles.cardDetailed}>{inner}</div>
    )
  }

  // ── Карточка-рекомендация (баннер + общие связи + действия) ──
  const body = (
    <>
      <div
        className={styles.pBanner}
        style={
          { ['--c1']: person.bg?.[0] ?? '#fdece2', ['--c2']: person.bg?.[1] ?? '#f3b89e' } as CSSProperties
        }
      >
        {person.banner ? (
          <img className={styles.pBannerImg} src={person.banner} alt="" aria-hidden />
        ) : null}
      </div>
      <span className={styles.kindChip}>
        <NetIco.User width={12} height={12} /> <span className="hideOnMobile">Человек</span>
      </span>
      {person.tag ? <span className={styles.pTag}>{person.tag}</span> : null}

      <div className={styles.pBody}>
        <div className={[styles.pAva, person.isOnline ? styles.pOnline : ''].join(' ')}>
          {person.avatar ? (
            <img className={styles.pAvaImg} src={person.avatar} alt={person.fullName} />
          ) : (
            person.avatarInitials
          )}
        </div>

        <div className={styles.pName}>
          <span className={styles.pNameText}>{person.fullName}</span>
          {person.companyLogo ? (
            <CompanyBadge logo={person.companyLogo} title={person.company} size={16} />
          ) : person.company ? (
            <span className={styles.pCompanyDot} title={person.company} aria-hidden>
              {person.company[0]}
            </span>
          ) : null}
        </div>
        <div className={styles.pRole}>
          {person.jobTitle}
          {person.company ? ` · ${person.company}` : ''}
        </div>
        {person.location ? (
          <div className={styles.pLoc}>
            <NetIco.Pin /> {person.location}
          </div>
        ) : null}

        <div className={styles.pFooter}>
          {person.mutual && person.mutual > 0 ? (
            <div className={[styles.pReason, styles.pReasonMutual].join(' ')}>
              <NetIco.UserPlus width={14} height={14} />
              <span>{mutualLabel(person.mutual)}</span>
            </div>
          ) : null}

          <div className={styles.pActions}>
            <button
              type="button"
              className={[styles.btnFollow, isFollowing ? styles.btnFollowDone : styles.btnFollowSolid].join(' ')}
              onClick={(e: MouseEvent) => {
                e.preventDefault()
                e.stopPropagation()
                onFollow?.(person.id)
              }}
            >
              {isFollowing ? '✓ Связь' : '+ Связь'}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  if (onOpen) {
    return (
      <div
        className={styles.pCard}
        role="button"
        tabIndex={0}
        onClick={() => onOpen(person)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen(person)
          }
        }}
      >
        {body}
      </div>
    )
  }

  return to ? (
    <Link to={to} className={styles.pCard}>
      {body}
    </Link>
  ) : (
    <div className={styles.pCard}>{body}</div>
  )
}
