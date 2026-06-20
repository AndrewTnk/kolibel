import { useRef, useState } from 'react'
import { uploadToStorage, type StorageCategory } from '../../lib/storage'
import { ImageCropper } from './ImageCropper'
import styles from './ImageUploadField.module.css'

type Shape = 'wide' | 'square' | 'round'

type Props = {
  label?: string
  /** Текущее значение — публичный URL картинки. */
  value: string | undefined
  /** Вызывается с новым URL после загрузки или с undefined при очистке. */
  onChange: (url: string | undefined) => void
  /** Подпапка в хранилище: avatar / banner / logo / posts. */
  category: StorageCategory
  /** Форма окна. wide — баннер, square — лого, round — аватар. */
  shape?: Shape
  /** Доп. класс на обёртку (для раскладки в строку). */
  className?: string
}

/**
 * Окно загрузки картинки: клик по окну (или по карандашу) открывает выбор файла,
 * для аватара/баннера — окно кадрирования (выбор позиции). Крестик удаляет фото.
 * Без ссылок и кнопок «Заменить/Удалить».
 */
export function ImageUploadField({ label, value, onChange, category, shape = 'wide', className }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)

  // round (аватар) и wide (баннер) кадрируем; square (лого) грузим как есть.
  const cropShape = shape === 'round' ? 'round' : shape === 'wide' ? 'wide' : null

  async function upload(data: File | Blob) {
    setError(null)
    setBusy(true)
    try {
      const file = data instanceof File ? data : new File([data], 'crop.jpg', { type: 'image/jpeg' })
      const url = await uploadToStorage(category, file)
      onChange(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить файл')
    } finally {
      setBusy(false)
    }
  }

  function onPick(file: File) {
    if (cropShape) setCropFile(file)
    else void upload(file)
  }

  function openPicker() {
    if (!busy) inputRef.current?.click()
  }

  return (
    <div className={[styles.field, className ?? ''].filter(Boolean).join(' ')}>
      {label ? <span className={styles.label}>{label}</span> : null}

      <div
        className={[styles.box, styles[shape]].join(' ')}
        role="button"
        tabIndex={0}
        aria-label={value ? 'Изменить изображение' : 'Добавить изображение'}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openPicker()
          }
        }}
      >
        {value ? (
          <img className={styles.img} src={value} alt="" />
        ) : (
          <span className={styles.empty}>Добавить фото</span>
        )}

        {busy ? <span className={styles.busy}>Загрузка…</span> : null}

        {value ? (
          <button
            type="button"
            className={styles.removeBtn}
            aria-label="Удалить изображение"
            title="Удалить"
            onClick={(e) => {
              e.stopPropagation()
              onChange(undefined)
            }}
          >
            ✕
          </button>
        ) : null}

        <span className={styles.editBadge} aria-hidden>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </span>

        <input
          ref={inputRef}
          className={styles.fileInput}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPick(file)
            e.currentTarget.value = ''
          }}
        />
      </div>

      {error ? <span className={styles.error}>{error}</span> : null}

      {cropFile && cropShape ? (
        <ImageCropper
          file={cropFile}
          shape={cropShape}
          onCancel={() => setCropFile(null)}
          onComplete={(blob) => {
            setCropFile(null)
            void upload(blob)
          }}
        />
      ) : null}
    </div>
  )
}
