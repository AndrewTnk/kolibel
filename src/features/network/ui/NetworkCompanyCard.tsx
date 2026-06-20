import { Link } from 'react-router-dom'
import { type CSSProperties, type MouseEvent } from 'react'
import type { Company } from '../model/types'
import { NetIco } from './netIcons'
import { mutualLabel } from '../lib/recommend'
import styles from './NetworkCompanyCard.module.css'

type Props = {
  company: Company
  /** Детальный вид — для модалок (описание) */
  detailed?: boolean
  /** Если задан (и нет onOpen) — карточка кликабельна и ведёт на этот путь */
  to?: string
  /** Подписан ли я на компанию */
  isFollowing?: boolean
  /** Подписаться/отписаться */
  onFollow?: (id: string) => void
  /** Открыть превью компании (peek-модалку) */
  onOpen?: (company: Company) => void
}

function meta(company: Company): string {
  const parts = [company.location].filter(Boolean)
  if (company.openVacancies > 0) parts.push(`${company.openVacancies} вакансий`)
  return parts.join(' · ')
}

export function NetworkCompanyCard({
  company,
  detailed = false,
  to,
  isFollowing = false,
  onFollow,
  onOpen,
}: Props) {
  if (detailed) {
    const logo = company.logo ? (
      <img className={styles.photoLg} style={{ objectFit: 'cover' }} src={company.logo} alt={company.name} />
    ) : null
    const inner = (
      <>
        <div className={styles.detHeader}>
          {logo ?? (
            <div className={styles.photoLg} aria-hidden>
              {company.logoInitial}
            </div>
          )}
          <div className={styles.info}>
            <div className={styles.nameLg}>{company.name}</div>
            {company.field ? <div className={styles.field}>{company.field}</div> : null}
            <div className={styles.meta}>{meta(company)}</div>
          </div>
        </div>
        {company.about ? <p className={styles.about}>{company.about}</p> : null}
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

  // ── Карточка-рекомендация компании ──
  const cardStyle = {
    ['--c1']: company.bg?.[0] ?? '#fdece2',
    ['--c2']: company.bg?.[1] ?? '#f3b89e',
  } as CSSProperties

  const body = (
    <>
      <div className={styles.cBanner}>
        {company.banner ? <img className={styles.cBannerImg} src={company.banner} alt="" aria-hidden /> : null}
      </div>
      <span className={styles.kindChip}>
        <NetIco.Building width={12} height={12} /> <span className="hideOnMobile">Компания</span>
      </span>

      <div className={styles.cBody}>
        <div className={styles.cAva}>
          {company.logo ? (
            <img className={styles.cAvaImg} src={company.logo} alt={company.name} />
          ) : (
            company.logoInitial
          )}
        </div>

        <div className={styles.cName}>
          <span className={styles.cNameText}>{company.name}</span>
        </div>
        {company.field ? <div className={styles.cRole}>{company.field}</div> : null}
        {company.location || company.country ? (
          <div className={styles.cLoc}>
            <NetIco.Pin /> {[company.location, company.country].filter(Boolean).join(', ')}
          </div>
        ) : null}

        <div className={styles.cFooter}>
          {company.fromNetwork && company.fromNetwork > 0 ? (
            <div className={[styles.reason, styles.reasonMutual].join(' ')}>
              <NetIco.UserPlus width={14} height={14} />
              <span>{mutualLabel(company.fromNetwork)}</span>
            </div>
          ) : null}

          <div className={styles.cActions}>
            <button
              type="button"
              className={[styles.btnFollow, isFollowing ? styles.btnFollowDone : styles.btnFollowSolid].join(' ')}
              onClick={(e: MouseEvent) => {
                e.preventDefault()
                e.stopPropagation()
                onFollow?.(company.id)
              }}
            >
              {isFollowing ? '✓ Связь' : '+ Связь'}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={styles.cCard} style={cardStyle}>
        {body}
      </Link>
    )
  }

  return (
    <div
      className={styles.cCard}
      style={cardStyle}
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(company)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.(company)
        }
      }}
    >
      {body}
    </div>
  )
}
