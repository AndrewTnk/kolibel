import { useEffect } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from 'tiptap-markdown'
import s from './RichEditor.module.css'

type Props = {
  /** Начальное значение — markdown. */
  value: string
  /** Колбэк на каждое изменение — отдаёт markdown. */
  onChange: (markdown: string) => void
  placeholder?: string
}

/** tiptap-markdown кладёт сериализатор в editor.storage.markdown (без типов). */
function getMarkdown(editor: Editor): string {
  const storage = editor.storage as { markdown?: { getMarkdown(): string } }
  return storage.markdown?.getMarkdown() ?? ''
}

/** WYSIWYG-редактор на TipTap. Читает/пишет markdown (через tiptap-markdown). */
export function RichEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Highlight,
      Image,
      Placeholder.configure({ placeholder: placeholder ?? 'Начни писать статью…' }),
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(getMarkdown(editor)),
  })

  // При размонтировании убираем редактор.
  useEffect(() => () => editor?.destroy(), [editor])

  if (!editor) return <div className={s.wrap} />

  return (
    <div className={s.wrap}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className={s.content} />
    </div>
  )
}

// ── Тулбар ───────────────────────────────────────────────────
function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean, onClick: () => void, title: string, label: React.ReactNode) => (
    <button
      type="button"
      className={[s.tb, active ? s.tbOn : ''].filter(Boolean).join(' ')}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {label}
    </button>
  )

  function setLink() {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Ссылка (URL):', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  function addImage() {
    const url = window.prompt('Ссылка на картинку (URL):', 'https://')
    if (!url) return
    editor.chain().focus().setImage({ src: url }).run()
  }

  return (
    <div className={s.toolbar}>
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Заголовок', <b>H2</b>)}
      {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'Подзаголовок', <b>H3</b>)}
      <span className={s.sep} />
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Жирный', <b>B</b>)}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Курсив', <i>I</i>)}
      {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Подчёркнутый', <u>U</u>)}
      {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'Зачёркнутый', <s>S</s>)}
      {btn(editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run(), 'Выделение', <span className={s.hl}>H</span>)}
      <span className={s.sep} />
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Маркир. список', <IcBullets />)}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Нумер. список', <IcNumbers />)}
      {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), 'Цитата', <IcQuote />)}
      {btn(editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), 'Код', <span className={s.mono}>{'</>'}</span>)}
      <span className={s.sep} />
      {btn(editor.isActive('link'), setLink, 'Ссылка', <IcLink />)}
      {btn(false, addImage, 'Картинка', <IcImage />)}
      <span className={s.sep} />
      {btn(false, () => editor.chain().focus().undo().run(), 'Отменить', <IcUndo />)}
      {btn(false, () => editor.chain().focus().redo().run(), 'Повторить', <IcRedo />)}
    </div>
  )
}

// ── Иконки тулбара ───────────────────────────────────────────
const sv = (children: React.ReactNode) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
)
const IcBullets = () => sv(<><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none" /><circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none" /></>)
const IcNumbers = () => sv(<><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><text x="2.5" y="8" fontSize="7" fill="currentColor" stroke="none">1</text><text x="2.5" y="14" fontSize="7" fill="currentColor" stroke="none">2</text><text x="2.5" y="20" fontSize="7" fill="currentColor" stroke="none">3</text></>)
const IcQuote = () => sv(<path d="M7 7H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2v3M17 7h-3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2v3" />)
const IcLink = () => sv(<><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 1 0-7-7L11.7 5" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L13 19" /></>)
const IcImage = () => sv(<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>)
const IcUndo = () => sv(<><path d="M3 7v6h6" /><path d="M3 13a9 9 0 1 0 3-7.7L3 8" /></>)
const IcRedo = () => sv(<><path d="M21 7v6h-6" /><path d="M21 13a9 9 0 1 1-3-7.7L21 8" /></>)
