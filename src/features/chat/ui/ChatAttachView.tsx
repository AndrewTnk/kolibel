import { useAppDispatch } from '../../../app/store/hooks'
import { vacanciesActions } from '../../vacancies/model/vacanciesSlice'
import { incrementVacancyView } from '../../vacancies/model/vacancyThunks'
import type { ChatAttach } from '../model/types'
import { ChatIco } from './chatIcons'
import styles from './Chat.module.css'

/** Рендер вложения сообщения: фото/видео — медиа, документ — карточка-ссылка, вакансия — карточка. */
export function ChatAttachView({ attach }: { attach: ChatAttach }) {
  const dispatch = useAppDispatch()
  const { kind, url, mime, title, subtitle, vacancyId, salary, city } = attach

  const isImage = kind === 'photo' || mime?.startsWith('image/')
  const isVideo = kind === 'video' || mime?.startsWith('video/')

  if (url && isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={styles.atMediaWrap}>
        <img className={styles.atImage} src={url} alt={title} />
      </a>
    )
  }

  if (url && isVideo) {
    return <video className={styles.atVideo} src={url} controls preload="metadata" />
  }

  if (kind === 'vacancy') {
    const meta = [salary, city].filter(Boolean).join(' · ')
    return (
      <button
        type="button"
        className={styles.atVacancy}
        onClick={() => {
          if (!vacancyId) return
          dispatch(vacanciesActions.openVacancy(vacancyId))
          void dispatch(incrementVacancyView(vacancyId))
        }}
      >
        <span className={styles.atVacancyLabel}>Вакансия</span>
        <span className={styles.atVacancyTitle}>{title}</span>
        {meta ? <span className={styles.atVacancyMeta}>{meta}</span> : null}
      </button>
    )
  }

  // Документ / прочее — карточка-ссылка для скачивания.
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={styles.attachCard}>
      <span className={styles.atFileIco}>
        <ChatIco.doc />
      </span>
      <span className={styles.atFileMeta}>
        <span className={styles.atTi}>{title}</span>
        {subtitle ? <span className={styles.atMe}>{subtitle}</span> : null}
      </span>
    </a>
  ) : (
    <div className={styles.attachCard}>
      <span className={styles.atTi}>{title}</span>
      {subtitle ? <span className={styles.atMe}>{subtitle}</span> : null}
    </div>
  )
}
