import { useAppDispatch } from '../../../app/store/hooks'
import { vacanciesActions } from '../model/vacanciesSlice'
import { VacancyFilters } from './VacancyFilters'
import { SeekerSheet } from './SeekerSheet'
import { Button } from '../../../shared/ui/Button/Button'
import { IcClose } from './icons'
import s from './Vacancies.module.css'

type Props = {
  open: boolean
  onClose: () => void
  /** Вызывается по «Применить» (фильтры применяются вживую, тут — закрыть + тост). */
  onApply: () => void
}

export function FiltersModal({ open, onClose, onApply }: Props) {
  const dispatch = useAppDispatch()

  if (!open) return null

  return (
    <SeekerSheet
      onClose={onClose}
      size="md"
      title="Фильтры"
      subtitle="Уточните выдачу под свои критерии"
      footerLeft={
        <Button type="button" variant="secondary" onClick={() => dispatch(vacanciesActions.resetFilters())}>
          <IcClose size={14} /> Сбросить
        </Button>
      }
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" onClick={onApply}>
            Применить
          </Button>
        </>
      }
    >
      <div className={s.mBody}>
        <VacancyFilters />
      </div>
    </SeekerSheet>
  )
}
