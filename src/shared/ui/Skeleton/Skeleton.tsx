import styles from './Skeleton.module.css'

type Props = {
  /** Ширина (число → px, строка → как есть). По умолчанию 100%. */
  width?: number | string
  /** Высота (число → px, строка → как есть). */
  height?: number | string
  /** Радиус скругления (число → px, строка → как есть). circle переопределяет на 50%. */
  radius?: number | string
  /** Круглый плейсхолдер (аватар/лого). */
  circle?: boolean
  className?: string
  style?: React.CSSProperties
}

function size(v: number | string | undefined): string | undefined {
  if (v == null) return undefined
  return typeof v === 'number' ? `${v}px` : v
}

/**
 * Базовый плейсхолдер-«скелетон» с мерцанием — показывается на месте контента,
 * пока грузятся данные.
 */
export function Skeleton({ width = '100%', height = 16, radius = 8, circle, className = '', style }: Props) {
  return (
    <span
      className={[styles.skeleton, className].join(' ')}
      style={{
        width: size(width),
        height: size(height),
        borderRadius: circle ? '50%' : size(radius),
        ...style,
      }}
      aria-hidden
    />
  )
}

/**
 * Скелетон ЦЕЛОГО блока: один силуэт блока во всю ширину (без имитации
 * внутреннего содержимого). Радиус по умолчанию — как у карточек (var(--radius)).
 * Используется на месте любого блока на время загрузки его данных.
 */
export function BlockSkeleton({
  height = 160,
  radius = 'var(--radius)',
  className = '',
  style,
}: {
  height?: number | string
  radius?: number | string
  className?: string
  style?: React.CSSProperties
}) {
  return <Skeleton width="100%" height={height} radius={radius} className={className} style={style} />
}
