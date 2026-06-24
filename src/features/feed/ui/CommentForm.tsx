import { useAppDispatch } from '../../../app/store/hooks'
import { addComment } from '../model/feedThunks'
import type { FeedPost } from '../model/types'
import { useAuthorIdentity } from '../lib/useAuthorIdentity'
import { CommentComposer } from './CommentComposer'
import styles from './Feed.module.css'

/** Форма добавления комментария (вынесена из списка, чтобы закреплять её внизу панели). */
export function CommentForm({ post }: { post: FeedPost }) {
  const dispatch = useAppDispatch()
  const me = useAuthorIdentity()

  return (
    <div className={styles.commentForm}>
      <CommentComposer
        me={me}
        placeholder="Написать комментарий…"
        onSend={(text) =>
          void dispatch(
            addComment({
              postId: post.id,
              authorName: me.name,
              authorAvatar: me.avatar,
              authorKind: me.kind,
              text,
            }),
          )
        }
      />
    </div>
  )
}
