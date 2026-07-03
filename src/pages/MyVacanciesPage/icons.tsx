/* Иконки страницы «Мои вакансии» (stroke=currentColor). */
const s = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const Icon = {
  plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} strokeWidth={2.6} aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  folder: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s} aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  folderPlus: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s} aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <line x1="12" y1="10" x2="12" y2="16" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  ),
  edit: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
    </svg>
  ),
  pause: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  ),
  play: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} aria-hidden>
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  ),
  back: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s} strokeWidth={2.4} aria-hidden>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  clock: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" {...s} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </svg>
  ),
  chevD: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" {...s} strokeWidth={2.4} aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  user: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  send: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s} aria-hidden>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  xCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  doc: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} aria-hidden>
      <path d="M6 2h8l4 4v16H6z M14 2v4h4" />
    </svg>
  ),
  check: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s} strokeWidth={2.6} aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  star: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} aria-hidden>
      <polygon points="12 2.6 14.9 8.5 21.4 9.4 16.7 14 17.8 20.5 12 17.4 6.2 20.5 7.3 14 2.6 9.4 9.1 8.5" />
    </svg>
  ),
  grid: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
}
