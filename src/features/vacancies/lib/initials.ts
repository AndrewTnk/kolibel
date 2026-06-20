/** Инициал(ы) компании/имени для аватара-заглушки. */
export function companyInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'K'
}

export function nameInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '—'
  )
}
