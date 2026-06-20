import { useState } from 'react'
import { RecModal } from '../../../../shared/ui/Recommendations/RecModal'
import styles from './RejectModal.module.css'

const REASONS = [
  'Недостаточно опыта под требования',
  'Не совпали по навыкам',
  'Ожидания по зарплате выше бюджета',
  'Выбрали другого кандидата',
  'Не подходит формат / локация',
  'Другая причина',
]

/**
 * Отклонить кандидата с причиной. onConfirm(reason, notify) — при notify кандидату
 * уходит вежливый автоответ в чат (см. confirmReject в MyVacanciesPage). Комментарий
 * для команды кандидату не виден и пока не сохраняется (TODO: бэк причины/комментария).
 */
export function RejectModal({
  name,
  onConfirm,
  onClose,
}: {
  name: string
  onConfirm: (reason: string, notify: boolean) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [notify, setNotify] = useState(true)
  void comment

  return (
    <RecModal title="Отклонить кандидата" onClose={onClose} maxWidth={520} fullScreenMobile>
      <div className={styles.subtitle}>{name}</div>

      <div className={styles.label}>Причина отказа</div>
      <div className={styles.reasons}>
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            className={[styles.reason, reason === r ? styles.reasonOn : ''].filter(Boolean).join(' ')}
            onClick={() => setReason(r)}
          >
            <span className={styles.radio} />
            {r}
          </button>
        ))}
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Комментарий для команды (не виден кандидату)</span>
        <textarea
          className={styles.area}
          placeholder="Например: сильный, но ищем сеньорнее"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>

      <button type="button" className={styles.toggleRow} onClick={() => setNotify((v) => !v)}>
        <span className={[styles.toggle, notify ? styles.toggleOn : ''].filter(Boolean).join(' ')} />
        Отправить кандидату вежливый автоответ
      </button>

      <div className={styles.foot}>
        <button type="button" className={styles.cancel} onClick={onClose}>
          Отмена
        </button>
        <button
          type="button"
          className={styles.confirm}
          disabled={!reason}
          onClick={() => reason && onConfirm(reason, notify)}
        >
          Отклонить
        </button>
      </div>
    </RecModal>
  )
}
