import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styles from './Markdown.module.css'

/** Рендер Markdown-текста (жирный/курсив/списки/заголовки/ссылки/код/таблицы). */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={[styles.md, className].filter(Boolean).join(' ')}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a(props) {
            const { node, ...rest } = props
            void node
            return <a {...rest} target="_blank" rel="noreferrer" />
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
