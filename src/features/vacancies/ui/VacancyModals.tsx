import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { vacanciesActions } from '../model/vacanciesSlice'
import { ApplyModal } from './ApplyModal'
import { ApplySuccessModal } from './ApplySuccessModal'
import { MyApplicationsModal } from './MyApplicationsModal'
import { CompanyPeekModal } from './CompanyPeekModal'
import { ContactEmployerModal } from './ContactEmployerModal'
import { SubscribedCompaniesListModal } from './SubscribedCompaniesListModal'

/**
 * Глобальный стек сидер-модалок (apply / success / contact / company / списки).
 * Монтируется в RootLayout — чтобы открывались с любой страницы (из VacancyModal,
 * рекомендаций, сайдбаров) и имели контекст роутера для ссылок на профили.
 */
export function VacancyModals() {
  const dispatch = useAppDispatch()
  const modal = useAppSelector((s) => s.vacancies.seekerModal)
  const items = useAppSelector((s) => s.vacanciesList.items)

  if (!modal) return null
  const close = () => dispatch(vacanciesActions.closeSeekerModal())

  switch (modal.kind) {
    case 'apply': {
      const v = items.find((x) => x.id === modal.id)
      return v ? <ApplyModal vacancy={v} onClose={close} /> : null
    }
    case 'applied': {
      const v = items.find((x) => x.id === modal.id)
      return v ? <ApplySuccessModal vacancy={v} onClose={close} /> : null
    }
    case 'contact': {
      const v = items.find((x) => x.id === modal.id)
      return v ? <ContactEmployerModal vacancy={v} onClose={close} /> : null
    }
    case 'applications':
      return <MyApplicationsModal onClose={close} />
    case 'companies-list':
      return <SubscribedCompaniesListModal onClose={close} />
    case 'company':
      return <CompanyPeekModal payload={modal.payload} onClose={close} />
    default:
      return null
  }
}
