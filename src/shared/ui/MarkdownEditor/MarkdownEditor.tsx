import { useRef, useState, type ReactNode } from 'react'
import { Markdown } from '../Markdown/Markdown'
import styles from './MarkdownEditor.module.css'

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}

/** Редактор Markdown: тулбар форматирования + textarea + предпросмотр. */
export function MarkdownEditor({ value, onChange, placeholder, rows = 6 }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const [preview, setPreview] = useState(false)

  /** Обернуть выделение парой меток (или вставить заготовку). */
  function wrap(before: string, after = before, placeholderText = '') {
    const ta = ref.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const sel = value.slice(start, end) || placeholderText
    const next = value.slice(0, start) + before + sel + after + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = start + before.length
      ta.selectionEnd = start + before.length + sel.length
    })
  }

  /** Добавить префикс к каждой строке выделения (списки, заголовок). */
  function prefixLines(makePrefix: (i: number) => string) {
    const ta = ref.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const block = value.slice(lineStart, end) || ''
    const lines = block.split('\n')
    const transformed = lines.map((l, i) => makePrefix(i) + l).join('\n')
    const next = value.slice(0, lineStart) + transformed + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => ta.focus())
  }

  const tools: { key: string; node: ReactNode; title: string; onClick: () => void }[] = [
    { key: 'b', node: <b>Ж</b>, title: 'Жирный', onClick: () => wrap('**', '**', 'текст') },
    { key: 'i', node: <i>К</i>, title: 'Курсив', onClick: () => wrap('*', '*', 'текст') },
    { key: 'h', node: <span>H</span>, title: 'Заголовок', onClick: () => prefixLines(() => '### ') },
    { key: 'ul', node: <span>•</span>, title: 'Маркированный список', onClick: () => prefixLines(() => '- ') },
    { key: 'ol', node: <span>1.</span>, title: 'Нумерованный список', onClick: () => prefixLines((i) => `${i + 1}. `) },
    { key: 'code', node: <span>{'</>'}</span>, title: 'Код', onClick: () => wrap('`', '`', 'код') },
    { key: 'link', node: <span>🔗</span>, title: 'Ссылка', onClick: () => wrap('[', '](https://)', 'текст') },
  ]

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        {tools.map((t) => (
          <button
            key={t.key}
            type="button"
            className={styles.tool}
            title={t.title}
            aria-label={t.title}
            onClick={t.onClick}
            disabled={preview}
          >
            {t.node}
          </button>
        ))}
        <button
          type="button"
          className={[styles.previewToggle, preview ? styles.previewActive : ''].join(' ')}
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? 'Редактировать' : 'Предпросмотр'}
        </button>
      </div>

      {preview ? (
        <div className={styles.preview}>
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <span className={styles.empty}>Нет текста для предпросмотра</span>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          className={styles.textarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
        />
      )}
    </div>
  )
}
