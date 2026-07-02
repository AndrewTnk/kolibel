import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { BlockSkeleton } from '../../../shared/ui/Skeleton/Skeleton'
import { loadPortfolio } from '../model/portfolioThunks'
import { PORTFOLIO_MAX_ITEMS, type PortfolioItem } from '../model/types'
import { PortfolioCard } from './PortfolioCard'
import { PortfolioItemModal } from './PortfolioItemModal'
import { PIc } from './icons'
import s from './Portfolio.module.css'

const EMPTY: PortfolioItem[] = []

/**
 * Вкладка «Портфолио» профиля: сетка карточек (фото/ссылки) + плитка
 * «Добавить работу» у владельца (до PORTFOLIO_MAX_ITEMS работ).
 */
export function PortfolioTab({ ownerId, canEdit }: { ownerId: string; canEdit: boolean }) {
  const dispatch = useAppDispatch()
  const loaded = useAppSelector((st) => st.portfolio.loadedOwners.includes(ownerId))
  const items = useAppSelector((st) => st.portfolio.byOwner[ownerId]) ?? EMPTY
  const [modal, setModal] = useState<{ item: PortfolioItem | null } | null>(null)

  useEffect(() => {
    if (!loaded) void dispatch(loadPortfolio(ownerId))
  }, [dispatch, ownerId, loaded])

  if (!loaded && items.length === 0) return <BlockSkeleton height={220} />

  const canAdd = canEdit && items.length < PORTFOLIO_MAX_ITEMS

  return (
    <div>
      {items.length === 0 && !canEdit ? (
        <div className={s.emptyNote}>Работ в портфолио пока нет.</div>
      ) : (
        <div className={s.grid}>
          {items.map((item) => (
            <PortfolioCard key={item.id} item={item} canEdit={canEdit} onEdit={(it) => setModal({ item: it })} />
          ))}
          {canAdd ? (
            <button
              type="button"
              className={[s.addTile, items.length === 0 ? s.addTileWide : ''].filter(Boolean).join(' ')}
              onClick={() => setModal({ item: null })}
            >
              <span className={s.addTileIcon}>
                <PIc.plus size={18} />
              </span>
              {items.length === 0 ? 'Добавь первую работу — фото или ссылку на проект' : 'Добавить работу'}
            </button>
          ) : null}
        </div>
      )}

      {canEdit && items.length >= PORTFOLIO_MAX_ITEMS ? (
        <div className={s.limitHint}>Максимум {PORTFOLIO_MAX_ITEMS} работ — удали что-нибудь, чтобы добавить новое.</div>
      ) : null}

      {modal ? <PortfolioItemModal item={modal.item} onClose={() => setModal(null)} /> : null}
    </div>
  )
}
