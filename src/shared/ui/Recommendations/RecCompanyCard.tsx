import { type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { Company } from '../../../features/network/model/types'
import styles from './RecCompanyCard.module.css'

/** Холодная палитра для квадратных лого-заглушек. */
const palette: [string, string][] = [
  ['#6366f1', '#a5b4fc'],
  ['#0ea5e9', '#7dd3fc'],
  ['#14b8a6', '#5eead4'],
]

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden>
      <path
        fill="currentColor"
        d="M16 11a3 3 0 100-6 3 3 0 000 6zm-8 0a3 3 0 100-6 3 3 0 000 6zm0 2c-2.7 0-8 1.3-8 4v2h9v-2c0-1 .4-1.9 1.1-2.6C8.8 13.1 8 13 8 13zm8 0c-.4 0-.9 0-1.5.1 1 .8 1.5 1.7 1.5 2.9v2h8v-2c0-2.7-5.3-4-8-4z"
      />
    </svg>
  )
}

type Props = {
  company: Company
  hue?: number
  following: boolean
  onToggle: () => void
}

export function RecCompanyCard({ company, hue = 0, following, onToggle }: Props) {
  const [c1, c2] = palette[hue % palette.length]
  const colorVars = { ['--c1']: c1, ['--c2']: c2 } as CSSProperties

  function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onToggle()
  }

  return (
    <Link to={`/u/${company.id}`} className={styles.item}>
      {company.logo ? (
        <img className={styles.logo} style={{ objectFit: 'cover' }} src={company.logo} alt="" />
      ) : (
        <div className={styles.logo} style={colorVars} aria-hidden>
          {company.logoInitial}
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{company.name}</span>
        </div>
        {company.field ? <div className={styles.field}>{company.field}</div> : null}
        {company.location ? <div className={styles.location}>{company.location}</div> : null}

        {company.openVacancies > 0 ? (
          <div className={styles.followers}>
            <PeopleIcon />
            <span>{company.openVacancies} открытых вакансий</span>
          </div>
        ) : null}

        <button
          type="button"
          className={[styles.followBtn, following ? styles.followBtnDone : ''].join(' ')}
          onClick={toggle}
        >
          {following ? 'Вы подписаны' : 'Подписаться'}
        </button>
      </div>
    </Link>
  )
}
