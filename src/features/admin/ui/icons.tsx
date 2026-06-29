// Компактный набор инлайн-иконок для админ-панели (stroke=currentColor).
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
}

export const Ic = {
  home: (p: P) => (
    <svg {...base} {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  ),
  users: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3 3 0 0 1 0 5.8M16.5 20a5.5 5.5 0 0 0-2-4.3" />
    </svg>
  ),
  company: (p: P) => (
    <svg {...base} {...p}>
      <rect x="4" y="3" width="11" height="18" rx="1.5" />
      <path d="M15 8h5v13H4" />
      <path d="M7.5 7h3M7.5 11h3M7.5 15h3" />
    </svg>
  ),
  briefcase: (p: P) => (
    <svg {...base} {...p}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  ),
  post: (p: P) => (
    <svg {...base} {...p}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  ),
  flag: (p: P) => (
    <svg {...base} {...p}>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  ),
  message: (p: P) => (
    <svg {...base} {...p}>
      <path d="M4 5h16v11H9l-4 4V5Z" />
    </svg>
  ),
  chart: (p: P) => (
    <svg {...base} {...p}>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-3M12 16V8M16 16v-6" />
    </svg>
  ),
  logout: (p: P) => (
    <svg {...base} {...p}>
      <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
      <path d="M10 16l4-4-4-4M14 12H4" />
    </svg>
  ),
  search: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  ),
  chevronLeft: (p: P) => (
    <svg {...base} {...p}>
      <path d="m14 6-6 6 6 6" />
    </svg>
  ),
  chevronRight: (p: P) => (
    <svg {...base} {...p}>
      <path d="m10 6 6 6-6 6" />
    </svg>
  ),
  calendar: (p: P) => (
    <svg {...base} {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  check: (p: P) => (
    <svg {...base} {...p}>
      <path d="m5 12 4 4 10-10" />
    </svg>
  ),
  checkCircle: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  ),
  x: (p: P) => (
    <svg {...base} {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  xCircle: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  ),
  warning: (p: P) => (
    <svg {...base} {...p}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 9v5M12 17.5v.2" />
    </svg>
  ),
  clock: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  ban: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  eye: (p: P) => (
    <svg {...base} {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
  eyeOff: (p: P) => (
    <svg {...base} {...p}>
      <path d="M4 4l16 16" />
      <path d="M9.5 5.3A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.7M6 7.5A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 3-.5" />
    </svg>
  ),
  trash: (p: P) => (
    <svg {...base} {...p}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" />
    </svg>
  ),
  restore: (p: P) => (
    <svg {...base} {...p}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 4v4h4" />
    </svg>
  ),
  shield: (p: P) => (
    <svg {...base} {...p}>
      <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
    </svg>
  ),
  download: (p: P) => (
    <svg {...base} {...p}>
      <path d="M12 4v11M8 11l4 4 4-4M5 20h14" />
    </svg>
  ),
  external: (p: P) => (
    <svg {...base} {...p}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  ),
  copy: (p: P) => (
    <svg {...base} {...p}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  ),
  ruble: (p: P) => (
    <svg {...base} {...p}>
      <path d="M8 21V4h5a4 4 0 0 1 0 8H6M6 16h7" />
    </svg>
  ),
  dot: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.2 2.2L15.5 9.5" />
    </svg>
  ),
}
