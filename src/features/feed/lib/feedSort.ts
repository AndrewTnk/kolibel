/** Режим сортировки общей ленты на главной. */
export type FeedSortMode = 'recommended' | 'connections' | 'popular' | 'new'

/** Пункты меню сортировки (первый — стандартный). */
export const FEED_SORT_OPTIONS: { value: FeedSortMode; label: string }[] = [
  { value: 'recommended', label: 'Рекомендованные' },
  { value: 'connections', label: 'Посты связей' },
  { value: 'popular', label: 'Популярные' },
  { value: 'new', label: 'Новые' },
]
