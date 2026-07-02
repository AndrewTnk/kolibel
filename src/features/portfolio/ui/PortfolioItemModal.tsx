import { useEffect, useRef, useState } from 'react'
import { useAppDispatch } from '../../../app/store/hooks'
import { RecModal } from '../../../shared/ui/Recommendations/RecModal'
import { uploadToStorage } from '../../../shared/lib/storage'
import { createPortfolioItem, updatePortfolioItem } from '../model/portfolioThunks'
import { PORTFOLIO_TITLE_LIMIT, type PortfolioItem, type PortfolioKind } from '../model/types'
import { isValidLink, normalizeLink } from '../lib/linkPreview'
import { LinkCover } from './LinkCover'
import { PIc } from './icons'
import s from './Portfolio.module.css'

/**
 * Модалка добавления/редактирования работы: чипы Фото/Ссылка, загрузка
 * изображения в Storage (как есть, без кропа) или URL с живым авто-превью
 * карточки, название с лимитом. Тип у существующей работы не меняется.
 */
export function PortfolioItemModal({ item, onClose }: { item: PortfolioItem | null; onClose: () => void }) {
  const dispatch = useAppDispatch()
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [kind, setKind] = useState<PortfolioKind>(item?.kind ?? 'image')
  const [title, setTitle] = useState(item?.title ?? '')
  const [link, setLink] = useState(item?.kind === 'link' ? item.url : '')
  const [imageUrl, setImageUrl] = useState<string | null>(item?.kind === 'image' ? item.url : null)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Живое превью карточки-ссылки — с дебаунсом, чтобы не дёргать скриншот на каждый символ.
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    if (kind !== 'link' || !isValidLink(link)) {
      setPreview(null)
      return
    }
    const t = window.setTimeout(() => setPreview(normalizeLink(link)), 600)
    return () => window.clearTimeout(t)
  }, [kind, link])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Можно загрузить только изображение')
      return
    }
    setError(null)
    setUploading(true)
    try {
      setImageUrl(await uploadToStorage('portfolio', file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить файл')
    } finally {
      setUploading(false)
    }
  }

  const canSave =
    !busy &&
    !uploading &&
    title.trim().length > 0 &&
    (kind === 'image' ? !!imageUrl : isValidLink(link))

  async function save() {
    if (!canSave) return
    setError(null)
    setBusy(true)
    const draft = {
      kind,
      title: title.trim(),
      url: kind === 'image' ? imageUrl! : normalizeLink(link),
      coverUrl: item?.coverUrl,
    }
    const res = item
      ? await dispatch(updatePortfolioItem({ ...draft, id: item.id }))
      : await dispatch(createPortfolioItem(draft))
    setBusy(false)
    if (createPortfolioItem.fulfilled.match(res) || updatePortfolioItem.fulfilled.match(res)) {
      onClose()
    } else {
      setError('Не удалось сохранить — попробуйте ещё раз.')
    }
  }

  return (
    <RecModal title={item ? 'Редактировать работу' : 'Новая работа'} onClose={onClose} maxWidth={560}>
      <div className={s.kindChips}>
        <button
          type="button"
          className={[s.kindChip, kind === 'image' ? s.kindChipOn : ''].filter(Boolean).join(' ')}
          onClick={() => setKind('image')}
          disabled={!!item}
        >
          <PIc.image size={16} /> Фото
        </button>
        <button
          type="button"
          className={[s.kindChip, kind === 'link' ? s.kindChipOn : ''].filter(Boolean).join(' ')}
          onClick={() => setKind('link')}
          disabled={!!item}
        >
          <PIc.link size={16} /> Ссылка
        </button>
      </div>

      {kind === 'image' ? (
        <div className={s.field}>
          <span className={s.fLabel}>Изображение</span>
          <div
            className={s.upArea}
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileRef.current?.click()
              }
            }}
          >
            {imageUrl ? (
              <>
                <img className={s.coverBlur} src={imageUrl} alt="" aria-hidden />
                <img className={s.upImg} src={imageUrl} alt="" />
              </>
            ) : null}
            {!imageUrl && !uploading ? (
              <div className={s.upAreaInner}>
                <PIc.image size={26} />
                <span>Загрузить изображение</span>
              </div>
            ) : null}
            {uploading ? <div className={s.upBusy}>Загрузка…</div> : null}
            {imageUrl && !uploading ? (
              <button
                type="button"
                className={s.upRemove}
                aria-label="Убрать изображение"
                onClick={(e) => {
                  e.stopPropagation()
                  setImageUrl(null)
                }}
              >
                ✕
              </button>
            ) : null}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        </div>
      ) : (
        <>
          <div className={s.field}>
            <span className={s.fLabel}>Ссылка</span>
            <input
              className={s.input}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="например, mysite.ru или github.com/user/repo"
              inputMode="url"
            />
          </div>
          {preview ? (
            <div className={s.field}>
              <span className={s.fLabel}>Превью карточки</span>
              <div className={s.previewBox}>
                <div className={s.cover}>
                  <LinkCover key={preview} url={preview} coverUrl={item?.coverUrl} />
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      <div className={s.field}>
        <span className={s.fLabel}>
          Название
          <span className={s.fCount}>
            {title.length}/{PORTFOLIO_TITLE_LIMIT}
          </span>
        </span>
        <input
          className={s.input}
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, PORTFOLIO_TITLE_LIMIT))}
          placeholder={kind === 'image' ? 'Например: Дизайн лендинга для кофейни' : 'Например: Мой пет-проект на React'}
        />
      </div>

      {error ? <div className={s.error}>{error}</div> : null}

      <div className={s.foot}>
        <button type="button" className={s.btnGhost} onClick={onClose}>
          Отмена
        </button>
        <button type="button" className={s.btnPrimary} onClick={save} disabled={!canSave}>
          {busy ? 'Сохранение…' : item ? 'Сохранить' : 'Добавить'}
        </button>
      </div>
    </RecModal>
  )
}
