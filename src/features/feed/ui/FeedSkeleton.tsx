import { BlockSkeleton } from '../../../shared/ui/Skeleton/Skeleton'
import styles from './Feed.module.css'

/** Скелетоны постов ленты — силуэты блоков-карточек на время загрузки. */
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.posts}>
      {Array.from({ length: count }, (_, i) => (
        <BlockSkeleton key={i} height={220} />
      ))}
    </div>
  )
}
