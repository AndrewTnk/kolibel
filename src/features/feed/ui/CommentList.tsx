import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { addComment, deleteComment, toggleCommentLike } from '../model/feedThunks'
import { reportUiActions } from '../../reports/model/reportUiSlice'
import type { FeedComment, FeedPost } from '../model/types'
import { useAuthorIdentity } from '../lib/useAuthorIdentity'
import { AuthorAvatar, AuthorName } from './AuthorAvatar'
import { emojify } from '../../../shared/ui/Emoji/emojify'
import styles from './Feed.module.css'

const DELETE_DELAY = 5 // секунд до удаления комментария (можно отменить)

/** «30 мая в 15:15» — формат даты комментария. */
function formatCommentDate(ts: number) {
  const d = new Date(ts)
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${date} в ${time}`
}

function repliesWord(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'ответ'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'ответа'
  return 'ответов'
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.8 6.6a5 5 0 0 0-7.1 0L12 8.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 22l8.8-8.3a5 5 0 0 0 0-7.1z" />
    </svg>
  )
}

/**
 * Одна строка комментария (инста-стиль): аватар | пузырь + мета-строка | лайк справа.
 * Мета-строка снизу: дата · Ответить · Удалить (своё).
 */
function CommentItem({
  post,
  c,
  onReply,
}: {
  post: FeedPost
  c: FeedComment
  onReply: (threadId: string, name: string) => void
}) {
  const dispatch = useAppDispatch()
  const myId = useAppSelector((s) => s.auth.user?.id)
  const isOwn = !!myId && c.authorId === myId
  const threadId = c.parentId ?? c.id

  // Отложенное удаление с отменой (как у постов): «Удалить» → отсчёт DELETE_DELAY с,
  // по истечении — deleteComment. «Отменить» возвращает комментарий.
  const [pending, setPending] = useState(false)
  const [seconds, setSeconds] = useState(DELETE_DELAY)
  useEffect(() => {
    if (!pending) return
    if (seconds <= 0) {
      void dispatch(deleteComment({ postId: post.id, commentId: c.id }))
      return
    }
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [pending, seconds, dispatch, post.id, c.id])

  if (pending) {
    return (
      <div className={[styles.comment, styles.commentDeleting].join(' ')}>
        <span className={styles.commentDelText}>Удаление через {seconds} с…</span>
        <button type="button" className={styles.commentDelCancel} onClick={() => setPending(false)}>
          Отменить
        </button>
      </div>
    )
  }

  return (
    <div className={styles.comment}>
      <AuthorAvatar id={c.authorId} name={c.authorName} avatar={c.authorAvatar} kind={c.authorKind} size={36} />
      <div className={styles.commentBody}>
        <div className={styles.commentBubble}>
          <AuthorName id={c.authorId} name={c.authorName} logo={c.authorCompanyLogo} logoTitle={c.authorSubtitle} className={styles.commentAuthor} />
          <div className={styles.commentDate}>
            {c.authorSubtitle ? `${c.authorSubtitle} · ` : ''}
            {formatCommentDate(c.createdAt)}
          </div>
          <div className={styles.commentText}>{emojify(c.text)}</div>
        </div>
        <div className={styles.commentMeta}>
          <button type="button" className={styles.commentAct} onClick={() => onReply(threadId, c.authorName)}>
            Ответить
          </button>
          {isOwn ? (
            <button
              type="button"
              className={styles.commentAct}
              onClick={() => {
                setSeconds(DELETE_DELAY)
                setPending(true)
              }}
            >
              Удалить
            </button>
          ) : (
            <button
              type="button"
              className={styles.commentAct}
              onClick={() => dispatch(reportUiActions.openReport({ type: 'comment', id: c.id, title: c.authorName }))}
            >
              Пожаловаться
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        className={[styles.commentLike, c.likedByMe ? styles.commentLikeOn : ''].filter(Boolean).join(' ')}
        onClick={() => dispatch(toggleCommentLike({ postId: post.id, commentId: c.id }))}
        aria-pressed={c.likedByMe}
        aria-label="Нравится"
      >
        <HeartIcon filled={c.likedByMe} />
        {c.likesCount > 0 ? <span className={styles.commentLikeCount}>{c.likesCount}</span> : null}
      </button>
    </div>
  )
}

/**
 * Список комментариев с ответами (один уровень), лайками и удалением.
 * Порядок: корневые — новые сверху; ответы под корнем — по возрастанию (как диалог).
 * Ответы свёрнуты за «Посмотреть N ответов» (инста-стиль). Используется в модалке и лайтбоксе.
 */
export function CommentList({ post }: { post: FeedPost }) {
  const dispatch = useAppDispatch()
  const me = useAuthorIdentity()
  const [replyTo, setReplyTo] = useState<{ threadId: string; name: string } | null>(null)
  const [replyText, setReplyText] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Строим дерево: корни (новые сверху) + ответы (по возрастанию).
  const { roots, repliesByParent } = useMemo(() => {
    const repliesByParent = new Map<string, FeedComment[]>()
    const roots: FeedComment[] = []
    for (const c of post.comments) {
      if (c.parentId) {
        const arr = repliesByParent.get(c.parentId) ?? []
        arr.push(c)
        repliesByParent.set(c.parentId, arr)
      } else {
        roots.push(c)
      }
    }
    roots.sort((a, b) => b.createdAt - a.createdAt)
    for (const arr of repliesByParent.values()) arr.sort((a, b) => a.createdAt - b.createdAt)
    return { roots, repliesByParent }
  }, [post.comments])

  function openReply(threadId: string, name: string) {
    setReplyTo({ threadId, name })
    setReplyText((prev) => prev || `${name}, `)
  }

  function sendReply() {
    if (!replyTo) return
    const t = replyText.trim()
    if (!t) return
    void dispatch(
      addComment({
        postId: post.id,
        parentId: replyTo.threadId,
        authorName: me.name,
        authorAvatar: me.avatar,
        authorKind: me.kind,
        text: t,
      }),
    )
    setExpanded((e) => ({ ...e, [replyTo.threadId]: true })) // раскрыть ветку, чтобы увидеть свой ответ
    setReplyText('')
    setReplyTo(null)
  }

  if (!post.comments.length) return null

  return (
    <div className={styles.comments}>
      {roots.map((root) => {
        const replies = repliesByParent.get(root.id) ?? []
        const isOpen = expanded[root.id]
        return (
          <div key={root.id} className={styles.commentThread}>
            <CommentItem post={post} c={root} onReply={openReply} />

            {replies.length ? (
              <div className={styles.commentRepliesWrap}>
                <button
                  type="button"
                  className={styles.commentRepliesToggle}
                  onClick={() => setExpanded((e) => ({ ...e, [root.id]: !e[root.id] }))}
                >
                  <span className={styles.commentRepliesDash} aria-hidden />
                  {isOpen ? 'Скрыть ответы' : `Посмотреть ${replies.length} ${repliesWord(replies.length)}`}
                </button>

                {isOpen ? (
                  <div className={styles.commentReplies}>
                    {replies.map((r) => (
                      <CommentItem key={r.id} post={post} c={r} onReply={openReply} />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {replyTo?.threadId === root.id ? (
              <form
                className={styles.commentReplyForm}
                onSubmit={(e) => {
                  e.preventDefault()
                  sendReply()
                }}
              >
                <input
                  className={styles.commentReplyInput}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Ответить ${replyTo.name}…`}
                  aria-label="Ответ"
                  autoFocus
                />
                <button type="button" className={styles.commentReplyCancel} onClick={() => { setReplyTo(null); setReplyText('') }}>
                  Отмена
                </button>
                <button type="submit" className={styles.commentReplySend} disabled={!replyText.trim()}>
                  Ответить
                </button>
              </form>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
