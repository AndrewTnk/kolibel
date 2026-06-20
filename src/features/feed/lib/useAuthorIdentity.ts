import { useAppSelector } from '../../../app/store/hooks'
import { getDisplayName } from '../../auth/lib/displayName'
import type { AuthorKind } from '../model/types'

export type AuthorIdentity = {
  id?: string
  name: string
  avatar?: string
  kind: AuthorKind
}

/** Личность текущего автора (для постов/комментариев): имя, аватар, тип, id. */
export function useAuthorIdentity(): AuthorIdentity {
  const user = useAppSelector((s) => s.auth.user)
  const isCompany = useAppSelector((s) => s.account.type === 'company')
  const company = useAppSelector((s) => s.company.profile)
  const resume = useAppSelector((s) => s.profile.resume)

  if (isCompany) {
    return { id: user?.id, name: company.name, avatar: company.avatar || company.logo, kind: 'company' }
  }
  return { id: user?.id, name: getDisplayName(user), avatar: resume.avatar, kind: 'user' }
}
