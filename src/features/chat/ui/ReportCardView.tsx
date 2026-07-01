import { useState } from 'react'
import { fetchMyReport, type MyReport } from '../../reports/lib/reportApi'
import type { ChatAttach } from '../model/types'
import styles from './Chat.module.css'

/** Человекочитаемые статусы жалобы (для бейджа в свёрнутой карточке). */
const STATUS_LABEL: Record<string, string> = {
  new: 'Новая',
  reviewing: 'На рассмотрении',
  resolved: 'Меры приняты',
  rejected: 'Отклонена',
}

/** CSS-модификатор бейджа по статусу. */
const STATUS_MOD: Record<string, string> = {
  new: styles.repBadgeNew,
  reviewing: styles.repBadgeNew,
  resolved: styles.repBadgeOk,
  rejected: styles.repBadgeRej,
}

const VERDICT_LABEL: Record<string, string> = {
  measures: 'Меры приняты',
  reject: 'Жалоба отклонена',
}

function fmtDate(ms: number): string {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Карточка жалобы в чате «Поддержка Kolibel». Свёрнута — №/дата/категория/статус.
 * Раскрытие подтягивает «живое» состояние жалобы (get_my_report): полный текст,
 * скриншоты и ветку ответов модерации — так ответы группируются в своей жалобе.
 */
export function ReportCardView({ attach }: { attach: ChatAttach }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<MyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Номер как в админ-панели: «#» + первые 8 символов UUID жалобы.
  const shortId = (attach.reportId ?? '').slice(0, 8)
  const category = attach.reportCategory || data?.category || 'Жалоба'
  const status = data?.status ?? attach.reportStatus ?? 'new'
  const statusLabel = STATUS_LABEL[status] ?? 'Новая'

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && !data && attach.reportId) {
      setLoading(true)
      setError(null)
      try {
        setData(await fetchMyReport(attach.reportId))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить жалобу')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className={styles.repCard}>
      <button type="button" className={styles.repHead} onClick={toggle} aria-expanded={open}>
        <span className={styles.repHeadMain}>
          <span className={styles.repLabel}>Жалоба{shortId ? ` #${shortId}` : ''}</span>
          <span className={styles.repCategory}>{category}</span>
        </span>
        <span className={[styles.repBadge, STATUS_MOD[status] ?? styles.repBadgeNew].join(' ')}>
          {statusLabel}
        </span>
        <span className={[styles.repChevron, open ? styles.repChevronOpen : ''].join(' ')} aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div className={styles.repBody}>
          {loading ? (
            <div className={styles.repMuted}>Загрузка…</div>
          ) : error ? (
            <div className={styles.repMuted}>{error}</div>
          ) : data ? (
            <>
              {data.createdAt ? (
                <div className={styles.repRow}>
                  <span className={styles.repRowKey}>Дата</span>
                  <span>{fmtDate(data.createdAt)}</span>
                </div>
              ) : null}
              {data.description ? (
                <div className={styles.repText}>{data.description}</div>
              ) : null}

              {data.evidence.length ? (
                <div className={styles.repEvi}>
                  {data.evidence.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={styles.repEviThumb}>
                      <img src={url} alt="Доказательство" />
                    </a>
                  ))}
                </div>
              ) : null}

              <div className={styles.repThread}>
                <div className={styles.repThreadTitle}>Ответы модерации</div>
                {data.responses.length ? (
                  data.responses.map((r, i) => (
                    <div key={i} className={styles.repResp}>
                      <div className={styles.repRespTop}>
                        <span
                          className={[
                            styles.repRespVerdict,
                            r.resolution === 'reject' ? styles.repRespRej : styles.repRespOk,
                          ].join(' ')}
                        >
                          {VERDICT_LABEL[r.resolution] ?? 'Ответ'}
                        </span>
                        {r.createdAt ? <span className={styles.repRespDate}>{fmtDate(r.createdAt)}</span> : null}
                      </div>
                      {r.reason ? <div className={styles.repRespReason}>Причина: {r.reason}</div> : null}
                      {r.comment ? <div className={styles.repRespComment}>{r.comment}</div> : null}
                    </div>
                  ))
                ) : (
                  <div className={styles.repMuted}>Жалоба на рассмотрении. Ответ появится здесь.</div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.repMuted}>Жалоба недоступна.</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
