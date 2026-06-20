import { useAppDispatch } from '../../../app/store/hooks'
import { vacanciesActions } from '../model/vacanciesSlice'
import type { Vacancy } from '../model/types'
import { SeekerSheet } from './SeekerSheet'
import { Button } from '../../../shared/ui/Button/Button'
import { IcChat, IcMail, IcTelegram } from './icons'
import s from './Vacancies.module.css'

type Props = {
  vacancy: Vacancy
  onClose: () => void
}

export function ContactEmployerModal({ vacancy, onClose }: Props) {
  const dispatch = useAppDispatch()
  const hasContacts = Boolean(vacancy.contactEmail || vacancy.contactTelegram)

  function openChat() {
    // TODO: интеграция с features/chat — старт беседы с работодателем (companyId).
    onClose()
    dispatch(vacanciesActions.showContactToast('Чат с работодателем скоро будет доступен'))
  }

  return (
    <SeekerSheet
      onClose={onClose}
      size="sm"
      title="Связаться с работодателем"
      subtitle={`${vacancy.title} · ${vacancy.company}`}
      footerLeft={
        <Button type="button" variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      }
      footer={
        <Button type="button" onClick={openChat}>
          <IcChat /> Открыть чат в Kolibel
        </Button>
      }
    >
      <div className={s.mBody}>
        {hasContacts ? (
          <div className={s.contacts}>
            {vacancy.contactEmail ? (
              <a className={s.contactChip} href={`mailto:${vacancy.contactEmail}`}>
                <IcMail /> {vacancy.contactEmail}
              </a>
            ) : null}
            {vacancy.contactTelegram ? (
              <a
                className={s.contactChip}
                href={`https://t.me/${vacancy.contactTelegram.replace(/^@/, '')}`}
                target="_blank"
                rel="noreferrer"
              >
                <IcTelegram /> {vacancy.contactTelegram}
              </a>
            ) : null}
          </div>
        ) : null}
        <p className={s.noteText}>
          Можно написать напрямую HR, или открыть внутренний чат Kolibel — там сразу подтянется ваш
          профиль и резюме.
        </p>
      </div>
    </SeekerSheet>
  )
}
