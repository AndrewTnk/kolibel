export type AuthUser = {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    name?: string
  }
}

export type AuthSession = {
  user: AuthUser
}
