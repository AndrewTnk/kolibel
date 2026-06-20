import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './Input.module.css'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: ReactNode
  error?: string | null
  /** Элемент, прижатый к правому краю поля (например, кнопка «глаз» для пароля). */
  endAdornment?: ReactNode
}

export function Input({ label, hint, error, className, endAdornment, ...rest }: Props) {
  const input = (
    <input
      className={[styles.input, endAdornment ? styles.hasAdornment : '', error ? styles.inputError : '']
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

