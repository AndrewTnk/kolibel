import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch } from '../../../app/store/hooks'
import { MoreMenu } from '../../../shared/ui/MoreMenu/MoreMenu'
import { deletePortfolioItem } from '../model/portfolioThunks'
import type { PortfolioItem } from '../model/types'
import { domainOf, faviconUrl } from '../lib/linkPreview'
import { LinkCover } from './LinkCover'
import { PIc } from './icons'
import s from './Portfolio.module.css'

const DELETE_DELAY = 5 // секунд до удаления (можно отменить) — как у постов/статей

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Карточка работы портфолио: обложка 16:10 + название + подпись (домен/дата).
 * Ссылка открывается в новой вкладке, фото — в лайтбоксе. У своей карточки
 * меню «⋯» (Редактировать / Удалить с отсчётом-отменой).
 */
export function PortfolioCard({
  item,
  canEdit,
  onEdit,
}: {
  item: PortfolioItem
  canEdit: boolean
  onEdit: (item: PortfolioItem) => void
}) {
  const dispatch = useAppDispatch()
  const [lightbox, setLightbox] = useState(false)
  const [pending, setPending] = useState(false)
  const [seconds, setSeconds] = useState(DELETE_DELAY)

  useEffect(() => {
    if (!pending) return
    if (seconds <= 0) {
      void dispatch(deletePortfolioItem(item.id))
      return
    }
    const t = window.setTimeout(() => setSeconds((v) => v - 1), 1000)
    return () => window.clearTimeout(t)
  }, [pending, seconds, dispatch, item.id])

  useEffect(() => {
    if (!lightbox) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightbox])

  if (pending) {
    return (
      <article className={s.card}>
        <div className={s.delCard}>
          <div className={s.delInfo}>
            <div className={s.delText}>Работа удаляется</div>
            <div className={s.delSub}>Удаление через {seconds} с</div>
          </div>
          <button type="button" className={s.delCancel} onClick={() => setPending(false)}>
            Отменить
          </button>
        </div>
      </article>
    )
  }

  const fav = item.kind === 'link' ? faviconUrl(item.url) : null
  const sub = item.kind === 'link' ? domainOf(item.url) ?? item.url : formatDate(item.createdAt)

  const inner = (
    <>
      <div className={s.cover}>
        {item.kind === 'link' ? (
          <LinkCover url={item.url} coverUrl={item.coverUrl} />
        ) : (
          <>
            {/* Фото целиком (contain) поверх размытой подложки из того же фото */}
            <img className={s.coverBlur} src={item.url} alt="" aria-hidden loading="lazy" />
            <img className={s.coverContain} src={item.url} alt={item.title} loading="lazy" />
          </>
        )}
      </div>
      <div className={s.cap}>
        <div className={s.capTitle}>
          <span className={s.capTitleText}>{item.title}</span>
          {item.kind === 'link' ? (
            <span className={s.capExt}>
              <PIc.ext size={14} />
            </span>
          ) : null}
        </div>
        <div className={s.capSub}>
          {fav ? (
            <img
              className={s.capFavicon}
              src={fav}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : null}
          <span className={s.capSubText}>{sub}</span>
        </div>
      </div>
    </>
  )

  return (
    <article className={s.card}>
      {canEdit ? (
        <div className={s.cardMenu}>
          <MoreMenu
            items={[
              { label: 'Редактировать', onClick: () => onEdit(item) },
              {
                label: 'Удалить',
                onClick: () => {
                  setSeconds(DELETE_DELAY)
                  setPending(true)
                },
              },
            ]}
          />
        </div>
      ) : null}

      {item.kind === 'link' ? (
        <a className={s.cardLink} href={item.url} target="_blank" rel="noreferrer noopener">
          {inner}
        </a>
      ) : (
        <button type="button" className={s.cardLink} onClick={() => setLightbox(true)}>
          {inner}
        </button>
      )}

      {lightbox
        ? createPortal(
            <div className={s.lbOverlay} onClick={() => setLightbox(false)} role="dialog" aria-modal aria-label={item.title}>
              <img className={s.lbImg} src={item.url} alt={item.title} onClick={(e) => e.stopPropagation()} />
              <button type="button" className={s.lbClose} onClick={() => setLightbox(false)} aria-label="Закрыть">
                ✕
              </button>
            </div>,
            document.body,
          )
        : null}
    </article>
  )
}
