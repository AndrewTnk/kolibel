import { type Ref } from 'react'
import type { FeedPost } from '../model/types'
import { CommentList } from './CommentList'

/** Список комментариев с ответами/лайками (форма ввода вынесена в `CommentForm`). */
export function PostComments({ post, rootRef }: { post: FeedPost; rootRef?: Ref<HTMLDivElement> }) {
  if (!post.comments.length) return null
  return (
    <div ref={rootRef}>
      <CommentList post={post} />
    </div>
  )
}
