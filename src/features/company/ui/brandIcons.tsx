/* Иконки бренд-страницы компании. */
const s = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const Ic = {
  pencil: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} strokeWidth={2.4} aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  share: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s} aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
      <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </svg>
  ),
  more: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  ),
  building: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} aria-hidden>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
    </svg>
  ),
  mapPin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} aria-hidden>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  globe: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  briefcase: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  users: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  bubble: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  bolt: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} aria-hidden>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  arrowRight: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" {...s} strokeWidth={2.4} aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  chevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} strokeWidth={2.4} aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  chevronUp: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} strokeWidth={2.4} aria-hidden>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  check: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" {...s} strokeWidth={3} aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  tg: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.5 4.2 2.7 11.5c-1.3.5-1.3 1.2-.3 1.5l4.8 1.5 1.9 5.7c.2.6.4.9.9.9.4 0 .6-.2.9-.5l2.5-2.4 5.1 3.8c.9.5 1.6.2 1.9-.9l3.4-16c.3-1.3-.5-1.9-1.3-1.5z" />
    </svg>
  ),
  mail: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" {...s} aria-hidden>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  verified: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2.5l2.5 1.9 3.1-.3 1.2 2.9 2.7 1.6-.9 3 .9 3-2.7 1.6-1.2 2.9-3.1-.3L12 21.5 9.5 19.6l-3.1.3-1.2-2.9L2.5 15.4l.9-3-.9-3 2.7-1.6 1.2-2.9 3.1.3z" fill="#2563eb" />
      <polyline points="8.5 12 11 14.5 15.5 9.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  settings: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </svg>
  ),
  layout: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  ),
  flag: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} aria-hidden>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
  ban: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
    </svg>
  ),
}
