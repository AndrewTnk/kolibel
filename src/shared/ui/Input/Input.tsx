import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './Input.module.css'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: ReactNode
  error?: string | null
  /**
   * Подсветка поля (рамка + свечение) под состояние. Используется, например, для
   * индикатора сложности пароля: warning — серый, success — зелёный, error — красный.
   * Если задан, перекрывает красную подсветку от `error`.
   */
  state?: 'error' | 'warning' | 'success'
  /** Элемент, прижатый к правому краю поля (например, кнопка «глаз» для пароля). */
  endAdornment?: ReactNode
}

const STATE_CLASS = {
  error: styles.inputDanger,
  warning: styles.inputWarn,
  success: styles.inputSuccess,
} as const

export function Input({ label, hint, error, state, className, endAdornment, ...rest }: Props) {
  const stateClass = state ? STATE_CLASS[state] : error ? styles.inputError : ''
  const input = (
    <input
      className={[styles.input, endAdornment ? styles.hasAdornment : '', stateClass]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  )

  return (
    <label className={[styles.field, className ?? ''].filter(Boolean).join(' ')}>
      {label ? <div className={styles.label}>{label}</div> : null}
      {endAdornment ? (
        <div className={styles.inputWrap}>
          {input}
          {endAdornment}
        </div>
      ) : (
        input
      )}
      {error ? <div className={styles.error}>{error}</div> : hint ? <div className={styles.hint}>{hint}</div> : null}
    </label>
  )
}

