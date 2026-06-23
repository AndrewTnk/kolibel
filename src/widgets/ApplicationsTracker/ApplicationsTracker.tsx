import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { vacanciesActions } from '../../features/vacancies/model/vacanciesSlice'
import { loadMyApplicationsDetailed } from '../../features/vacancies/model/vacancyThunks'
import type { MyApplicationStatus } from '../../features/vacancies/model/types'
import { formatPosted } from '../../features/vacancies/lib/labels'
import { CompanyAvatar } from '../../features/vacancies/ui/CompanyAvatar'
import { BlockSkeleton } from '../../shared/ui/Skeleton/Skeleton'
import styles from './ApplicationsTracker.module.css'

const STAGE: Record<MyApplicationStatus, { label: string; dot: string; text: string }> = {
  sent: { label: 'Отклик отправлен', dot: styles.dotSent, text: styles.stageSent },
  rejected: { label: 'Отказ', dot: styles.dotRejected, text: styles.stageRejected },
  closed: { label: 'Закрыто', dot: styles.dotClosed, text: styles.stageClosed },
}

/** Правый сайдбар: пул моих откликов со статус-бейджами и переходом к полному списку. */
export function ApplicationsTracker() {
  const dispatch = useAppDispatch()
  const apps = useAppSelector((s) => s.vacancies.myApplications)
  const loaded = useAppSelector((s) => s.vacanciesList.loaded)

  useEffect(() => {
    void dispatch(loadMyApplicationsDetailed())
  }, [dispatch])

  if (!loaded && !apps.length) {
    return <BlockSkeleton height={240} />
  }

  const preview = apps.slice(0, 5)

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.title}>Мои отклики</div>
        <span className={styles.count}>{apps.length}</span>
      </div>

      {apps.length ? (
        <>
          <div className={styles.list}>
            {preview.map((a) => {
              const st = STAGE[a.status]
              return (
                <button
                  key={a.id}
                  type="button"
                  className={[styles.item, a.status === 'closed' ? styles.itemClosed : ''].filter(Boolean).join(' ')}
                  onClick={() => dispatch(vacanciesActions.openApplications())}
                >
                  <CompanyAvatar initial={a.companyInitials} logo={a.companyLogo} className={styles.ava} />
                  <div className={styles.meta}>
                    <div className={styles.name}>{a.vacancyTitle}</div>
                    <div className={styles.co}>
                      {a.company} · {formatPosted(a.appliedAt)}
                    </div>
                    <div className={styles.badgeRow}>
                      <span className={[styles.dot, st.dot].join(' ')} aria-hidden />
                      <span className={[styles.stage, st.text].join(' ')}>{st.label}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className={styles.cardLink}
            onClick={() => dispatch(vacanciesActions.openApplications())}
          >
            Открыть все отклики →
          </button>
        </>
      ) : (
        <p className={styles.empty}>Здесь появятся вакансии, на которые вы откликнулись.</p>
      )}
    </div>
  )
}
