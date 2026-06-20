import { RecModal } from '../../shared/ui/Recommendations/RecModal'
import { useProfilePulse, buildSparkline, formatDelta } from '../../features/profile/lib/useProfilePulse'
import styles from './ProfileAnalyticsModal.module.css'

const CHART_W = 760
const CHART_H = 140

/** Подпись-индикатор тренда по приросту в процентах. */
export function trendLabel(deltaPct: number): string {
  if (deltaPct >= 20) return 'Сильный рост'
  if (deltaPct > 0) return 'Рост'
  if (deltaPct === 0) return 'Без изменений'
  return 'Спад'
}

export function ProfileAnalyticsModal({ onClose }: { onClose: () => void }) {
  const pulse = useProfilePulse()
  const { line, area } = buildSparkline(pulse.series, CHART_W, CHART_H, 10)

  const kpis = [
    { ...pulse.views, label: 'просмотров профиля' },
    { ...pulse.applications, label: 'откликов на вакансии' },
  ]

  return (
    <RecModal title="Аналитика профиля" onClose={onClose} maxWidth={880} fullScreenMobile>
      <div className={styles.subtitle}>За последние 7 дней</div>

      <div className={styles.kpiGrid}>
        {kpis.map((k) => (
          <div key={k.label} className={styles.kpiCard}>
            <div className={styles.kpiNum}>
              {k.count}{' '}
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
            <div className={styles.chartTitle}>Просмотры профиля</div>
            <div className={styles.chartSub}>{formatDelta(pulse.views.deltaPct)} к прошлой неделе</div>
          </div>
          <div className={styles.chartHint}>{trendLabel(pulse.views.deltaPct)}</div>
        </div>
        <div className={styles.chartBox}>
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" width="100%" height="100%">
            <defs>
              <linearGradient id="anGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff7f50" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#ff7f50" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#anGrad)" />
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
        <div className={styles.chartTitle}>Кто смотрит твой профиль</div>
        <div className={styles.chartSub} style={{ marginBottom: 10 }}>
          Разбивка по типу зрителя
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
