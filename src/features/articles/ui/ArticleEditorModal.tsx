import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { RichEditor } from '../../../shared/ui/RichEditor/RichEditor'
import { Select, type SelectOption } from '../../../shared/ui/Select/Select'
import { ImageUploadField } from '../../../shared/ui/ImageUploadField/ImageUploadField'
import { ARTICLE_CATEGORIES, PLATFORM_UPDATE_CATEGORY } from '../lib/categories'
import { createArticle, updateArticle } from '../model/articleThunks'
import type { Article } from '../model/types'
import s from './ArticleEditor.module.css'

type Props = {
  /** Редактируемая статья (если есть) — иначе создаём новую. */
  article?: Article | null
  onClose: () => void
  /** Колбэк после успешного сохранения (id статьи). */
  onSaved?: (id: string) => void
}

export function ArticleEditorModal({ article, onClose, onSaved }: Props) {
  const dispatch = useAppDispatch()
  // Издатель обновлений платформы (publisher_roles) — видит категорию «Update».
  const publisher = useAppSelector((st) => st.admin.publisher)
  const [category, setCategory] = useState(article?.category ?? '')
  const [title, setTitle] = useState(article?.title ?? '')
  const [subtitle, setSubtitle] = useState(article?.subtitle ?? '')
  const [cover, setCover] = useState<string | undefined>(article?.coverUrl)
  const [body, setBody] = useState(article?.body ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Блокируем скролл фоновой страницы, пока открыта модалка (иначе два скролла справа).
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Опции категорий: плейсхолдер + «Update» у издателя + общий пул
  // (+ текущее значение, если оно не из пула — старые статьи).
  const categoryOptions: SelectOption<string>[] = [
    { value: '', label: 'Выберите категорию' },
    ...(publisher
      ? [{ value: PLATFORM_UPDATE_CATEGORY, label: `${PLATFORM_UPDATE_CATEGORY} — обновление платформы` }]
      : []),
    ...ARTICLE_CATEGORIES.map((c) => ({ value: c, label: c })),
    ...(category &&
    !ARTICLE_CATEGORIES.includes(category as never) &&
    !(publisher && category === PLATFORM_UPDATE_CATEGORY)
      ? [{ value: category, label: category }]
      : []),
  ]

  // Все поля обязательны, кроме обложки — чтобы не было статей с пустым контентом.
  const canSave =
    category.trim().length > 0 &&
    title.trim().length > 0 &&
    subtitle.trim().length > 0 &&
    body.trim().length > 0

  async function save(status: 'draft' | 'published') {
    if (!canSave || busy) return
    setBusy(true)
    setError(null)
    const draft = {
      category: category.trim(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      coverUrl: cover,
      body,
      status,
    }
    try {
      const result = article
        ? await dispatch(updateArticle({ ...draft, id: article.id })).unwrap()
        : await dispatch(createArticle(draft)).unwrap()
      onSaved?.(result.id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить статью')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className={s.scrim} onClick={onClose}>
      <div className={s.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <h2 className={s.headTitle}>{article ? 'Редактировать статью' : 'Новая статья'}</h2>
          <button type="button" className={s.close} onClick={onClose} aria-label="Закрыть">✕</button>
        </div>

        <div className={s.body}>
          <ImageUploadField
            label="Обложка (необязательно)"
            value={cover}
            onChange={setCover}
            category="article"
            shape="wide"
          />

          <div className={s.field}>
            <span className={s.fieldLab}>Категория</span>
            <Select
              value={category}
              options={categoryOptions}
              onChange={setCategory}
              ariaLabel="Категория статьи"
              className={s.catSelect}
            />
          </div>

          <label className={s.field}>
            <span className={s.fieldLab}>Заголовок</span>
            <input
              className={[s.input, s.inputTitle].join(' ')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="О чём статья?"
              maxLength={60}
            />
          </label>

          <label className={s.field}>
            <span className={s.fieldLab}>Подзаголовок</span>
            <textarea
              className={s.textarea}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Короткое описание — что человек узнает"
              rows={2}
              maxLength={100}
            />
          </label>

          <div className={s.field}>
            <span className={s.fieldLab}>Текст статьи</span>
            <RichEditor value={body} onChange={setBody} placeholder="Начни писать статью…" />
          </div>

          {error ? <div className={s.error}>{error}</div> : null}
        </div>

        <div className={s.foot}>
          <button type="button" className={s.btnGhost} onClick={() => save('draft')} disabled={!canSave || busy}>
            В черновики
          </button>
          <button type="button" className={s.btnPrimary} onClick={() => save('published')} disabled={!canSave || busy}>
            {busy ? 'Сохраняем…' : article ? 'Сохранить' : 'Опубликовать'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
