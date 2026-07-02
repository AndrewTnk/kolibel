/**
 * Пул широких тем для статей — только общие рубрики, без узкой конкретики
 * (например «IT и разработка», а не «React»; «Бизнес», а не «Мой стартап»).
 */
export const ARTICLE_CATEGORIES = [
  'IT и разработка',
  'Дизайн',
  'Продукт',
  'Бизнес',
  'Карьера',
  'Маркетинг',
  'Менеджмент',
  'Финансы',
  'Аналитика и данные',
  'HR и рекрутинг',
  'Образование',
  'Саморазвитие',
] as const

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number]

/**
 * Служебная категория статей-обновлений платформы. НЕ входит в общий пул:
 * доступна в редакторе только аккаунту с ролью издателя (`publisher_roles`,
 * миграция 0051), на сервере зашита в RLS-политики articles.
 */
export const PLATFORM_UPDATE_CATEGORY = 'Update'

export function isPlatformUpdate(category: string): boolean {
  return category === PLATFORM_UPDATE_CATEGORY
}
