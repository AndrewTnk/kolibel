import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { vacanciesActions } from '../model/vacanciesSlice'
import styles from './Vacancies.module.css'

export function ContactToast() {
  const dispatch = useAppDispatch()
  const message = useAppSelector((s) => s.vacancies.contactToast)

  useEffect(() => {
    if (!message) return
    const t = window.setTimeout(() => dispatch(vacanciesActions.clearContactToast()), 4000)
    return () => window.clearTimeout(t)
  }, [dispatch, message])

  if (!message) return null

  return createPortal(
    <div className={styles.toast} role="status">
      Контакты: {message}
    </div>,
    document.body,
  )
}
