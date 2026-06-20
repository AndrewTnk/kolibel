import { useComposer, DOC_ACCEPT } from '../lib/useComposer'
import { formatSalary } from '../../vacancies/lib/labels'
import { AuthorAvatar } from './AuthorAvatar'
import { PhotoIcon, VideoIcon, DocIcon, BriefIcon, SendIcon, PinIcon } from './composerIcons'
import styles from './Feed.module.css'

export function PostComposer({ compact = false }: { compact?: boolean }) {
  const c = useComposer()

  return (
    <div className={[styles.composer, compact ? styles.composerCompact : ''].filter(Boolean).join(' ')}>
      <div className={styles.composerRow}>
        <AuthorAvatar
          name={c.isCompany ? c.company.name : c.authorName}
          avatar={c.isCompany ? c.company.avatar || c.company.logo : c.resume.avatar}
          kind={c.isCompany ? 'company' : 'user'}
          size={compact ? 32 : 38}
        />

        <textarea
          className={styles.composerArea}
          value={c.postText}
          onChange={(e) => c.setPostText(e.target.value)}
          placeholder="Поделись обновлением…"
          rows={1}
        />

        {/* Булавка: меню выбора вложения (Фото/Видео/Документ, у компании ещё Вакансия) */}
        <div className={styles.attachWrap} ref={c.attachMenuRef}>
          <button
            type="button"
            className={styles.attachPin}
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

          {c.attachOpen ? (
            <div className={styles.attachMenu} role="menu">
              {c.attachMode === 'main' ? (
                <>
                  <button
                    type="button"
                    className={styles.attachItem}
                    onClick={() => {
                      c.pickFiles('image/*')
                      c.closeAttach()
                    }}
                  >
                    <span className={styles.attachItemIco}><PhotoIcon /></span> Фото
                  </button>
                  <button
                    type="button"
                    className={styles.attachItem}
                    onClick={() => {
                      c.pickFiles('video/*')
                      c.closeAttach()
                    }}
                  >
                    <span className={styles.attachItemIco}><VideoIcon /></span> Видео
                  </button>
                  <button
                    type="button"
                    className={styles.attachItem}
                    onClick={() => {
                      c.pickFiles(DOC_ACCEPT)
                      c.closeAttach()
                    }}
                  >
                    <span className={styles.attachItemIco}><DocIcon /></span> Документ
                  </button>
                  {c.isCompany ? (
                    <button
                      type="button"
                      className={styles.attachItem}
                      onClick={() => c.setAttachMode('vacancy')}
                    >
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
                      <button
                        key={v.id}
                        type="button"
                        className={styles.vacancyMenuItem}
                        onClick={() => {
                          c.setVacancy(v)
                          c.closeAttach()
                        }}
                      >
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
        </div>

        {/* Отправить — всегда видна; активна только при наличии контента */}
        <button
          type="button"
          className={styles.sendBtn}
          disabled={!c.canPublish || c.publishing}
          onClick={c.publish}
          title="Опубликовать"
          aria-label="Опубликовать"
        >
          <SendIcon />
        </button>
      </div>

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
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      d="M6 2h8l4 4v16H6z M14 2v4h4"
                    />
                  </svg>
                </div>
              )}
              <div className={styles.mediaName} title={m.name}>
                {m.name}
              </div>
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

      <input
        ref={c.fileRef}
        className={styles.fileInput}
        type="file"
        multiple
        onChange={c.onFileChange}
      />

      {c.uploadError ? <div className={styles.uploadError}>{c.uploadError}</div> : null}
    </div>
  )
}
