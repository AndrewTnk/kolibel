import { Children, isValidElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { slugify } from '../../lib/slug'
import styles from './Markdown.module.css'

/** Плоский текст из React-детей (для slug-id заголовков). */
function childrenToString(children: ReactNode): string {
  return Children.toArray(children)
    .map((c) => {
      if (typeof c === 'string' || typeof c === 'number') return String(c)
      if (isValidElement(c)) return childrenToString((c.props as { children?: ReactNode }).children)
      return ''
    })
    .join('')
}

/** Рендер Markdown-текста (жирный/курсив/списки/заголовки/ссылки/код/таблицы). Заголовки получают slug-id (для якорей/оглавления). */
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
          h2(props) {
            const { node, children, ...rest } = props
            void node
            return <h2 id={slugify(childrenToString(children))} {...rest}>{children}</h2>
          },
          h3(props) {
            const { node, children, ...rest } = props
            void node
            return <h3 id={slugify(childrenToString(children))} {...rest}>{children}</h3>
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
