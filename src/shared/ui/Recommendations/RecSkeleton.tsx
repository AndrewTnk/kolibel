import { BlockSkeleton } from '../Skeleton/Skeleton'

/** Скелетон сайдбар-блока рекомендаций — силуэт всего блока на время загрузки. */
export function RecSkeleton({ height = 200 }: { height?: number }) {
  return <BlockSkeleton height={height} />
}
