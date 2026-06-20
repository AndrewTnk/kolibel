/**
 * Словари для лексического матчинга v1: синонимы навыков, таксономия ролей,
 * стоп-слова. Легко расширять — точность матчинга напрямую зависит от полноты.
 * (v2 заменит свободно-текстовую часть эмбеддингами, см. supabase/functions/embed.)
 */

/** Алиасы навыков: вариант (нормализованный) → канон. Нормализация: lowercase, ё→е. */
export const SKILL_ALIASES: Record<string, string> = {
  js: 'javascript',
  'java script': 'javascript',
  ts: 'typescript',
  reactjs: 'react',
  'react.js': 'react',
  'react js': 'react',
  vuejs: 'vue',
  'vue.js': 'vue',
  nodejs: 'node.js',
  node: 'node.js',
  'next': 'next.js',
  nextjs: 'next.js',
  nest: 'nest.js',
  nestjs: 'nest.js',
  postgres: 'postgresql',
  psql: 'postgresql',
  k8s: 'kubernetes',
  'ci/cd': 'cicd',
  'ci cd': 'cicd',
  'гит': 'git',
  'вёрстка': 'верстка',
  'html5': 'html',
  'css3': 'css',
  'rest api': 'rest',
  'restful': 'rest',
  'графql': 'graphql',
  'питон': 'python',
  'го': 'golang',
  go: 'golang',
  'си шарп': 'c#',
  csharp: 'c#',
  'фигма': 'figma',
  'продуктовый дизайн': 'product design',
  ux: 'ux',
  ui: 'ui',
  'ui/ux': 'ux',
  'управление продуктом': 'product management',
  'продакт менеджмент': 'product management',
  'аналитика данных': 'data analytics',
  'sql запросы': 'sql',
  'тестирование': 'qa',
  'автотесты': 'qa',
  'автотестирование': 'qa',
}

/**
 * Таксономия ролей: роль → характерные токены (нормализованные, по одному слову).
 * Используется и для классификации заголовка, и как «гейт» по специальности.
 */
export const ROLES: Record<string, string[]> = {
  frontend: ['frontend', 'фронтенд', 'фронтендер', 'верстка', 'верстальщик', 'react', 'vue', 'angular', 'ui'],
  backend: ['backend', 'бэкенд', 'бекенд', 'сервер', 'серверный', 'node', 'python', 'java', 'golang', 'php', 'api'],
  fullstack: ['fullstack', 'фуллстек', 'full-stack'],
  mobile: ['mobile', 'мобильный', 'android', 'ios', 'flutter', 'kotlin', 'swift'],
  devops: ['devops', 'sre', 'kubernetes', 'docker', 'инфраструктура', 'cicd'],
  qa: ['qa', 'тестировщик', 'тестирование', 'автотесты', 'quality'],
  data: ['data', 'аналитик', 'аналитика', 'analyst', 'sql', 'bi', 'ml', 'datascience', 'данных'],
  design: ['дизайнер', 'дизайн', 'design', 'designer', 'figma', 'ux', 'ui'],
  product: ['продакт', 'product', 'продукт', 'продуктовый'],
  management: ['менеджер', 'manager', 'руководитель', 'lead', 'head', 'тимлид', 'teamlead', 'director'],
  marketing: ['маркетинг', 'маркетолог', 'marketing', 'smm', 'реклама', 'таргетолог'],
  sales: ['продажи', 'sales', 'менеджер', 'аккаунт'],
  hr: ['hr', 'рекрутер', 'рекрутинг', 'recruiter', 'кадры', 'персонал', 'talent'],
}

/** Кластеры близких ролей — «смежные» специальности получают частичный гейт. */
export const ROLE_CLUSTER: Record<string, string> = {
  frontend: 'engineering',
  backend: 'engineering',
  fullstack: 'engineering',
  mobile: 'engineering',
  devops: 'engineering',
  qa: 'engineering',
  data: 'engineering',
  design: 'product',
  product: 'product',
  management: 'business',
  marketing: 'business',
  sales: 'business',
  hr: 'business',
}

/** Стоп-слова (не несут смысла для матчинга). */
export const STOPWORDS = new Set([
  // RU
  'и', 'или', 'в', 'на', 'с', 'по', 'для', 'от', 'до', 'за', 'из', 'к', 'о', 'об', 'у', 'не', 'но', 'а',
  'мы', 'вы', 'ты', 'он', 'она', 'это', 'как', 'что', 'чтобы', 'наш', 'наша', 'наши', 'свой', 'который',
  'будет', 'есть', 'был', 'опыт', 'работа', 'работы', 'команда', 'команде', 'компания', 'компании',
  'год', 'года', 'лет', 'требования', 'обязанности', 'условия', 'умение', 'знание', 'навыки',
  // EN
  'and', 'or', 'the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'with', 'we', 'you', 'our', 'is', 'are',
  'be', 'will', 'work', 'team', 'experience', 'years', 'skills', 'requirements',
])
