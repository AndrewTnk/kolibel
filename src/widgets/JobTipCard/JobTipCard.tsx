import { useNavigate } from 'react-router-dom'
import { IcEdit } from '../../features/vacancies/ui/icons'
import styles from './JobTipCard.module.css'

/**
 * Левый сайдбар: декоративная подсказка от Kolibel с CTA на дополнение профиля.
 * Цифры — мок. TODO: вычислить число кейсов/портфолио из profileSlice.
 */
export function JobTipCard() {
  const navigate = useNavigate()

  return (
    <div className={styles.card}>
      <div className={styles.title}>Подсказка от Kolibel</div>
      <p className={styles.body}>
        Кандидаты с <b>портфолио в профиле</b> получают отклик от HR в среднем в <b>2.4 раза чаще</b>. У
        тебя сейчас 3 кейса — добавь ещё 2, чтобы попасть в топ выдачи.
      </p>
      <button type="button" className={styles.action} onClick={() => navigate('/profile')}>
        <IcEdit /> Дополнить профиль
      </button>
    </div>
  )
}
