import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './CompanyBrand.module.css'

/**
 * Лента фото «Жизнь в компании» со стрелками пролистывания. Общая для
 * своей бренд-страницы (клик по фото → модалка галереи) и публичного
 * профиля компании (клик → лайтбокс). Стрелки видны только когда по
 * краям есть скрытый контент; на тач-устройствах скрыты (листают пальцем).
 */
export function GalleryStrip({
  photos,
  onPhotoClick,
}: {
  photos: { id: string; url: string }[]
  onPhotoClick: (index: number) => void
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  // Показываем/прячем стрелки в зависимости от того, есть ли ещё контент по краям.
  const updateArrows = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
    const el = stripRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows, photos.length])

  const scrollStrip = (dir: -1 | 1) => {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' })
  }

  return (
    <div className={styles.galWrap}>
      <div className={styles.gallery} ref={stripRef}>
        {photos.map((g, i) => (
          <button key={g.id} type="button" className={styles.galCell} onClick={() => onPhotoClick(i)}>
            {/* onLoad — пересчитать стрелки, когда картинки задали ширину ленты. */}
            <img src={g.url} alt="" onLoad={updateArrows} />
          </button>
        ))}
      </div>
      {canLeft ? (
        <button
          type="button"
          className={[styles.galArrow, styles.galArrowLeft].join(' ')}
          onClick={() => scrollStrip(-1)}
          aria-label="Назад"
        >
          ‹
        </button>
      ) : null}
      {canRight ? (
        <button
          type="button"
          className={[styles.galArrow, styles.galArrowRight].join(' ')}
          onClick={() => scrollStrip(1)}
          aria-label="Далее"
        >
          ›
        </button>
      ) : null}
    </div>
  )
}
