import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useComposer, DOC_ACCEPT } from '../lib/useComposer'
import { formatSalary } from '../../vacancies/lib/labels'
import { AuthorAvatar } from './AuthorAvatar'
import { PhotoIcon, VideoIcon, DocIcon, BriefIcon, PinIcon, CloseIcon } from './composerIcons'
import styles from './Feed.module.css'

/**
 * Мобильный композер поста — полноэкранное окно (как в соцсетях): поле ввода сверху,
 * X справа сверху, булавка вложений слева снизу, «Опубликовать» справа снизу.
 * Открывается из иконки «новый пост» в шапке (рядом с уведомлениями).
 */
export function MobilePostComposer({ onClose }: { onClose: () => void }) {
  const c = useComposer(onClose)

  // Закрытие по Escape; блокируем скролл фона.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !c.attachOpen) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, c.attachOpen])

  const authorName = c.isCompany ? c.company.name : c.authorName
  const authorAvatar = c.isCompany ? c.company.avatar || c.company.logo : c.resume.avatar

  return createPortal(
    <div className={styles.mpcOverlay} role="dialog" aria-modal aria-label="Новый пост">
      <div className={styles.mpcTop}>
        <div className={styles.mpcAuthor}>
          <AuthorAvatar name={authorName} avatar={authorAvatar} kind={c.isCompany ? 'company' : 'user'} size={36} />
          <span className={styles.mpcAuthorName}>{authorName}</span>
        </div>
        <button type="button" className={styles.mpcClose} onClick={onClose} aria-label="Закрыть">
          <CloseIcon />
        </button>
      </div>

      <div className={styles.mpcBody}>
        <textarea
          className={styles.mpcArea}
          value={c.postText}
          onChange={(e) => c.setPostText(e.target.value)}
          placeholder="О чём хотите рассказать?"
          autoFocus
        />

        {c.media.length ? (
          <div className={styles.mediaGrid}>
            {c.media.map((m) => (
              <div key={m.url} className={styles.mediaItem}>
                <button
                  type="button"
                  className={styles.mediaRemove}
                  onClick={() => c.removeMedia(m.url)}
                  aria-label="Удалить вложение"
                  title="Удалить"
                >
                  ✕
                </button>
                {m.kind === 'image' ? (
                  <img className={styles.mediaPreview} src={m.url} alt="" />
                ) : m.kind === 'video' ? (
                  <video className={styles.mediaPreview} src={m.url} controls playsInline />
                ) : (
                  <div className={styles.docPreview} aria-hidden>
                    <svg viewBox="0 0 24 24" width="26" height="26">
                      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M6 2h8l4 4v16H6z M14 2v4h4" />
                    </svg>
                  </div>
                )}
                <div className={styles.mediaName} title={m.name}>{m.name}</div>
              </div>
            ))}
          </div>
        ) : null}

        {c.vacancy ? (
          <div className={styles.vacancyChip}>
            <div className={styles.vacancyChipMain}>
              <span className={styles.vacancyChipLabel}>Вакансия</span>
              <span className={styles.vacancyChipTitle}>{c.vacancy.title}</span>
              <span className={styles.vacancyChipMeta}>
                {formatSalary(c.vacancy.salaryFrom, c.vacancy.salaryTo, c.vacancy.currency)} · {c.vacancy.city}
              </span>
            </div>
            <button type="button" className={styles.vacancyChipRemove} onClick={() => c.setVacancy(null)} aria-label="Убрать вакансию">
              ✕
            </button>
          </div>
        ) : null}

        {c.uploadError ? <div className={styles.uploadError}>{c.uploadError}</div> : null}
      </div>

      <div className={styles.mpcBottom}>
        {/* Булавка вложений — меню открывается вверх */}
        <div className={styles.mpcAttachWrap} ref={c.attachMenuRef}>
          {c.attachOpen ? (
            <div className={[styles.attachMenu, styles.mpcAttachMenu].join(' ')} role="menu">
              {c.attachMode === 'main' ? (
                <>
                  <button type="button" className={styles.attachItem} onClick={() => { c.pickFiles('image/*'); c.closeAttach() }}>
                    <span className={styles.attachItemIco}><PhotoIcon /></span> Фото
                  </button>
                  <button type="button" className={styles.attachItem} onClick={() => { c.pickFiles('video/*'); c.closeAttach() }}>
                    <span className={styles.attachItemIco}><VideoIcon /></span> Видео
                  </button>
                  <button type="button" className={styles.attachItem} onClick={() => { c.pickFiles(DOC_ACCEPT); c.closeAttach() }}>
                    <span className={styles.attachItemIco}><DocIcon /></span> Документ
                  </button>
                  {c.isCompany ? (
                    <button type="button" className={styles.attachItem} onClick={() => c.setAttachMode('vacancy')}>
                      <span className={styles.attachItemIco}><BriefIcon /></span> Вакансия
                      <span className={styles.attachItemChevron} aria-hidden>›</span>
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <button type="button" className={styles.attachBack} onClick={() => c.setAttachMode('main')}>
                    ‹ Вакансия
                  </button>
                  {c.vacancies.length ? (
                    c.vacancies.map((v) => (
                      <button key={v.id} type="button" className={styles.vacancyMenuItem} onClick={() => { c.setVacancy(v); c.closeAttach() }}>
                        <span className={styles.vacancyMenuTitle}>{v.title}</span>
                        <span className={styles.vacancyMenuMeta}>
                          {formatSalary(v.salaryFrom, v.salaryTo, v.currency)} · {v.city}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className={styles.vacancyMenuEmpty}>Нет активных вакансий</div>
                  )}
                </>
              )}
            </div>
          ) : null}
          <button
            type="button"
            className={styles.mpcPin}
            title="Прикрепить"
            aria-label="Прикрепить вложение"
            aria-expanded={c.attachOpen}
            onClick={() => {
              c.setAttachMode('main')
              c.setAttachOpen((v) => !v)
            }}
          >
            <PinIcon />
          </button>
        </div>

        <button
          type="button"
          className={styles.mpcPublish}
          disabled={!c.canPublish || c.publishing}
          onClick={c.publish}
        >
          {c.publishing ? 'Публикуем…' : 'Опубликовать'}
        </button>
      </div>

      <input ref={c.fileRef} className={styles.fileInput} type="file" multiple onChange={c.onFileChange} />
    </div>,
    document.body,
  )
}
