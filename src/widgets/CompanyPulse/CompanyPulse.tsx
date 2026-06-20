import { useState } from 'react'
import { buildSparkline, formatDelta } from '../../features/profile/lib/useProfilePulse'
import { useCompanyPulse } from '../../features/company/lib/useCompanyPulse'
import { CompanyAnalyticsModal } from '../../features/company/ui/CompanyAnalyticsModal/CompanyAnalyticsModal'
import styles from './CompanyPulse.module.css'

const W = 232
const H = 64

/** Пульс страницы компании (правый сайдбар). Sparkline + 3 метрики → аналитика. */
export function CompanyPulse() {
  const pulse = useCompanyPulse()
  const [open, setOpen] = useState(false)
  const { line, area, points } = buildSparkline(pulse.series, W, H, 4)
  const last = points[points.length - 1]

  return (
    <>
      <div
        className={styles.card}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <div className={styles.head}>
          <div className={styles.title}>Пульс страницы</div>
          <div className={styles.delta}>{formatDelta(pulse.pageViews.deltaPct)} / 7 дн.</div>
        </div>

        <div className={styles.sparkBox}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height="100%">
            <defs>
              <linearGradient id="companyPulseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff7f50" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#ff7f50" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#companyPulseGrad)" />
            <path d={line} fill="none" stroke="#ff7f50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {last ? <circle cx={last[0]} cy={last[1]} r="3.5" fill="#ff7f50" stroke="#fff" strokeWidth="2" /> : null}
          </svg>
        </div>

        <div className={styles.legend}>
          <div className={styles.item}>
            <div className={styles.num}>
              {pulse.pageViews.count.toLocaleString('ru-RU')}{' '}
              <span className={styles.up} style={{ color: pulse.pageViews.deltaPct > 0 ? undefined : 'var(--muted)' }}>
                {formatDelta(pulse.pageViews.deltaPct)}
              </span>
            </div>
            <div className={styles.label}>просмотров страницы</div>
          </div>
          <div className={styles.item}>
            <div className={styles.num}>
              {pulse.applications.count}{' '}
              <span className={styles.up} style={{ color: pulse.applications.deltaPct > 0 ? undefined : 'var(--muted)' }}>
                {formatDelta(pulse.applications.deltaPct)}
              </span>
            </div>
            <div className={styles.label}>откликов за неделю</div>
          </div>
          <div className={styles.item}>
            <div className={styles.num}>
              +{pulse.newFollowers.count} <span className={styles.up}>за нед.</span>
            </div>
            <div className={styles.label}>новых подписчиков</div>
          </div>
        </div>
      </div>

      {open ? <CompanyAnalyticsModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}
