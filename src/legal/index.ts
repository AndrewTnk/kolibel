import terms from './terms.md?raw'
import privacy from './privacy.md?raw'
import consent from './consent.md?raw'
import consentPublic from './consent-public.md?raw'
import { LEGAL_REQUISITES } from './requisites'

export type LegalDoc = {
  slug: string
  /** Полное название (заголовок страницы). */
  title: string
  /** Короткое название для навигации. */
  short: string
  /** Текст документа (markdown) с подставленными реквизитами. */
  body: string
}

/** Подставляет реквизиты владельца ({{OPERATOR_NAME}} и т. п.) в текст документа. */
function fill(md: string): string {
  return md.replace(/\{\{(\w+)\}\}/g, (m, key: string) => {
    const v = (LEGAL_REQUISITES as Record<string, string>)[key]
    return v ?? m
  })
}

export const LEGAL_DOCS: LegalDoc[] = [
  { slug: 'terms', title: 'Пользовательское соглашение', short: 'Соглашение', body: fill(terms) },
  { slug: 'privacy', title: 'Политика обработки персональных данных', short: 'Политика данных', body: fill(privacy) },
  { slug: 'consent', title: 'Согласие на обработку персональных данных', short: 'Согласие на обработку', body: fill(consent) },
  { slug: 'public-profile', title: 'Согласие на распространение персональных данных', short: 'Публичный профиль', body: fill(consentPublic) },
]

/** Документ по slug; неизвестный slug → первый документ (соглашение). */
export function getLegalDoc(slug?: string): LegalDoc {
  return LEGAL_DOCS.find((d) => d.slug === slug) ?? LEGAL_DOCS[0]
}
