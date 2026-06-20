import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '../../app/store/hooks'
import { NetIco } from '../../features/network/ui/netIcons'
import styles from './NetworkActivity.module.css'

type Act = {
  id: string
  icon: 'follow' | 'job'
  tone: 'default' | 'green'
  text: ReactNode
  meta: string
  to: string
}

function vacancyWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'новая вакансия'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'новые вакансии'
  return 'новых вакансий'
}

const SHOWN = 5

/** «В твоей сети сегодня» — события из реальных данных: новые подписчики и
 *  свежие вакансии компаний из сети. */
export function NetworkActivity({ audience = 'user' }: { audience?: 'user' | 'company' }) {
  const isCompany = audience === 'company'
  const followers = useAppSelector((s) => s.network.followers)
  const followingCompanies = useAppSelector((s) => s.network.followingCompanies)
  const recommendedCompanies = useAppSelector((s) => s.network.recommendedCompanies)
  const [expanded, setExpanded] = useState(false)

  const items = useMemo<Act[]>(() => {
    const acts: Act[] = []

    // Компании с новыми вакансиями за неделю (из подписок + рекомендаций).
    const seen = new Set<string>()
    for (const c of [...followingCompanies, ...recommendedCompanies]) {
      if (seen.has(c.id) || !c.newVacancies) continue
      seen.add(c.id)
      acts.push({
        id: `job-${c.id}`,
        icon: 'job',
        tone: 'default',
        text: (
          <>
            <b>{c.name}</b> опубликовали {c.newVacancies} {vacancyWord(c.newVacancies)}
          </>
        ),
        meta: 'за последнюю неделю',
        to: `/vacancies?company=${c.id}`,
      })
    }

    // Новые подписчики.
    for (const p of followers) {
      acts.push({
        id: `follow-${p.id}`,
        icon: 'follow',
        tone: 'green',
        text: (
          <>
            <b>{p.fullName}</b> {isCompany ? 'подписался на вашу компанию' : 'подписался на тебя'}
          </>
        ),
        meta: p.jobTitle || (isCompany ? 'в сети компании' : 'в твоей сети'),
        to: `/u/${p.id}?from=network`,
      })
    }

    return acts
  }, [followers, followingCompanies, recommendedCompanies, isCompany])

  if (!items.length) return null

  const visible = expanded ? items : items.slice(0, SHOWN)

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.title}>{isCompany ? 'В сети компании сегодня' : 'В твоей сети сегодня'}</div>
        <div className={styles.sub}>
          {isCompany
            ? 'Что произошло у людей и компаний, на которых вы подписаны'
            : 'Что произошло у людей и компаний, на которых ты подписан'}
        </div>
      </div>
      <div className={styles.list}>
        {visible.map((a) => (
          <Link key={a.id} to={a.to} className={styles.row}>
            <span className={[styles.ico, a.tone === 'green' ? styles.icoGreen : ''].join(' ')}>
              {a.icon === 'follow' ? <NetIco.UserPlus /> : <NetIco.Briefcase />}
            </span>
            <div className={styles.rowMain}>
              <div className={styles.text}>{a.text}</div>
              <div className={styles.meta}>{a.meta}</div>
            </div>
          </Link>
        ))}
      </div>
      {items.length > SHOWN ? (
        <button type="button" className={styles.showAll} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Свернуть' : `Показать все (${items.length})`}
        </button>
      ) : null}
    </div>
  )
}
