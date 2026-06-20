import { useEffect, useRef, useState } from 'react'
import styles from './ImageCropper.module.css'

type CropShape = 'round' | 'wide'

type Props = {
  file: File
  shape: CropShape
  onCancel: () => void
  onComplete: (blob: Blob) => void
}

// Размер окна предпросмотра и итогового изображения по форме.
const VIEW: Record<CropShape, { w: number; h: number }> = {
  round: { w: 260, h: 260 },
  wide: { w: 360, h: 90 },
}
const OUT: Record<CropShape, { w: number; h: number }> = {
  round: { w: 512, h: 512 },
  wide: { w: 1600, h: 400 },
}

/** Модалка кадрирования: пользователь двигает/масштабирует фото, выбирая видимую область. */
export function ImageCropper({ file, shape, onCancel, onComplete }: Props) {
  const view = VIEW[shape]
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [url, setUrl] = useState('')
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)

  // Загружаем файл в Image, чтобы узнать натуральные размеры
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    const img = new Image()
    img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = u
    return () => URL.revokeObjectURL(u)
  }, [file])

  const base = nat ? Math.max(view.w / nat.w, view.h / nat.h) : 1
  const scale = base * zoom
  const rw = nat ? nat.w * scale : 0
  const rh = nat ? nat.h * scale : 0

  function clampTo(x: number, y: number, w: number, h: number) {
    return {
      x: Math.min(0, Math.max(view.w - w, x)),
      y: Math.min(0, Math.max(view.h - h, y)),
    }
  }
  function clamp(x: number, y: number) {
    return clampTo(x, y, rw, rh)
  }

  // Центрируем один раз при загрузке изображения
  useEffect(() => {
    if (!nat) return
    const s = base * zoom
    const w = nat.w * s
    const h = nat.h * s
    setOffset(clampTo((view.w - w) / 2, (view.h - h) / 2, w, h))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nat])

  function onZoom(z: number) {
    setZoom(z)
    if (!nat) return
    const s = base * z
    const w = nat.w * s
    const h = nat.h * s
    setOffset((o) => clampTo(o.x, o.y, w, h))
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    const nx = drag.current.ox + (e.clientX - drag.current.px)
    const ny = drag.current.oy + (e.clientY - drag.current.py)
    setOffset(clamp(nx, ny))
  }
  function onPointerUp() {
    drag.current = null
  }

  function confirm() {
    if (!nat || !imgRef.current) return
    const out = OUT[shape]
    const canvas = document.createElement('canvas')
    canvas.width = out.w
    canvas.height = out.h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Область исходника, попадающая в окно предпросмотра
    const sx = -offset.x / scale
    const sy = -offset.y / scale
    const sW = view.w / scale
    const sH = view.h / scale
    ctx.drawImage(imgRef.current, sx, sy, sW, sH, 0, 0, out.w, out.h)
    canvas.toBlob((blob) => blob && onComplete(blob), 'image/jpeg', 0.9)
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-label="Кадрирование фото">
      <div className={styles.panel}>
        <div className={styles.title}>Выберите область</div>
        <p className={styles.hint}>Перетащите фото и настройте масштаб — показана будет видимая часть.</p>

        <div
          className={[styles.viewport, shape === 'round' ? styles.round : styles.wide].join(' ')}
          style={{ width: view.w, height: view.h }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {url ? (
            <img
              ref={imgRef}
              className={styles.img}
              src={url}
              alt=""
              draggable={false}
              style={{ left: offset.x, top: offset.y, width: rw, height: rh }}
            />
          ) : null}
          <div className={styles.mask} aria-hidden />
        </div>

        <input
          className={styles.zoom}
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
          aria-label="Масштаб"
        />

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className={styles.save} onClick={confirm} disabled={!nat}>
            Готово
          </button>
        </div>
      </div>
    </div>
  )
}
