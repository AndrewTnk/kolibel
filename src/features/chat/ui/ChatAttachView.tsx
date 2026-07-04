import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch } from '../../../app/store/hooks'
import { vacanciesActions } from '../../vacancies/model/vacanciesSlice'
import { incrementVacancyView } from '../../vacancies/model/vacancyThunks'
import type { ChatAttach } from '../model/types'
import { ChatIco } from './chatIcons'
import { SharedPostCard } from './SharedPostCard'
import { SharedProfileCard } from './SharedProfileCard'
import { ReportCardView } from './ReportCardView'
import styles from './Chat.module.css'

/** Рендер вложения сообщения: фото/видео — медиа, документ — карточка, вакансия/пост/профиль — карточка. */
export function ChatAttachView({ attach }: { attach: ChatAttach }) {
  const dispatch = useAppDispatch()
  const [zoom, setZoom] = useState(false)
  const { kind, url, mime, title, subtitle, vacancyId, salary, city, post, profile } = attach

  const isImage = kind === 'photo' || mime?.startsWith('image/')
  const isVideo = kind === 'video' || mime?.startsWith('video/')

  // Закрытие лайтбокса по Esc + блокировка скролла фона.
  useEffect(() => {
    if (!zoom) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setZoom(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [zoom])

  // Служебное вложение текстовой пересылки: несёт только forwardedFrom,
  // строку «Переслано от …» рендерит пузырь (ChatThread), тут рисовать нечего.
  // (Ранний return строго ПОСЛЕ всех хуков.)
  if (kind === 'forward') return null

  if (url && isImage) {
    // Фото открывается полноэкранным лайтбоксом в этой же вкладке (как в ленте), не в новой.
    return (
      <>
        <button type="button" className={styles.atMediaWrap} onClick={() => setZoom(true)} aria-label="Открыть фото">
          <img className={styles.atImage} src={url} alt={title} />
        </button>
        {zoom
          ? createPortal(
              <div className={styles.imgLbOverlay} onClick={() => setZoom(false)} role="dialog" aria-modal="true">
                <button className={styles.imgLbClose} type="button" onClick={() => setZoom(false)} aria-label="Закрыть">
                  ✕
                </button>
                <img className={styles.imgLbImg} src={url} alt={title} onClick={(e) => e.stopPropagation()} />
              </div>,
              document.body,
            )
          : null}
      </>
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

  if (kind === 'report') {
    return <ReportCardView attach={attach} />
  }

  if (kind === 'post' && post) {
    return <SharedPostCard post={post} />
  }

  if (kind === 'profile' && profile) {
    return <SharedProfileCard profile={profile} />
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
