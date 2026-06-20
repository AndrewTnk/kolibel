import { RecModal } from '../../../../shared/ui/Recommendations/RecModal'
import { buildSparkline, formatDelta } from '../../../profile/lib/useProfilePulse'
import { trendLabel } from '../../../../widgets/ProfileAnalyticsModal/ProfileAnalyticsModal'
import { useCompanyPulse } from '../../lib/useCompanyPulse'
import styles from './CompanyAnalyticsModal.module.css'

const CHART_W = 760
const CHART_H = 140

/** Большая аналитика страницы компании: 3 KPI + sparkline + разбивка источников. */
export function CompanyAnalyticsModal({ onClose }: { onClose: () => void }) {
  const pulse = useCompanyPulse()
  const { line, area } = buildSparkline(pulse.series, CHART_W, CHART_H, 10)

  const kpis = [
    { ...pulse.pageViews, label: 'просмотров страницы' },
    { ...pulse.vacancyViews, label: 'просмотров вакансий' },
    { ...pulse.applications, label: 'откликов за неделю' },
  ]

  return (
    <RecModal title="Аналитика компании" onClose={onClose} maxWidth={880} fullScreenMobile>
      <div className={styles.subtitle}>За последние 7 дней</div>

      <div className={styles.kpiGrid}>
        {kpis.map((k) => (
          <div key={k.label} className={styles.kpiCard}>
            <div className={styles.kpiNum}>
              {k.count.toLocaleString('ru-RU')}{' '}
              <span className={styles.kpiDelta} style={{ color: k.deltaPct > 0 ? undefined : 'var(--muted)' }}>
                {formatDelta(k.deltaPct)}
              </span>
            </div>
            <div className={styles.kpiLabel}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartHead}>
          <div>
            <div className={styles.chartTitle}>Просмотры страницы и вакансий</div>
            <div className={styles.chartSub}>{formatDelta(pulse.pageViews.deltaPct)} к прошлой неделе</div>
          </div>
          <div className={styles.chartHint}>{trendLabel(pulse.pageViews.deltaPct)}</div>
        </div>
        <div className={styles.chartBox}>
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" width="100%" height="100%">
            <defs>
              <linearGradient id="companyAnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff7f50" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#ff7f50" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#companyAnGrad)" />
            <path
              d={line}
              fill="none"
              stroke="#ff7f50"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartTitle}>Откуда приходят на страницу</div>
        <div className={styles.chartSub} style={{ marginBottom: 10 }}>
          Источники просмотров за неделю
        </div>
        <div className={styles.breakdown}>
          {pulse.breakdown.map((b) => (
            <div key={b.label} className={styles.breakRow}>
              <span className={styles.breakLabel}>{b.label}</span>
              <span className={styles.breakBar}>
                <i style={{ width: `${Math.round(b.ratio * 100)}%` }} />
              </span>
              <span className={styles.breakValue}>{b.value}</span>
            </div>
          ))}
        </div>
      </div>
    </RecModal>
  )
}
