/** Иконки для раздела «Сеть» (stroke-based, currentColor). */
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const NetIco = {
  User: (p: P) => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  UserPlus: (p: P) => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 11h-6M19 8v6" />
    </svg>
  ),
  Building: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...base} {...p}>
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  ),
  Sparkle: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...base} {...p}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  ),
  Chat: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...base} {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Pin: (p: P) => (
    <svg width="12" height="12" viewBox="0 0 24 24" {...base} {...p}>
      <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Filter: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...base} {...p}>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  ),
  Search: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Link: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...base} {...p}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  Mail: (p: P) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...p}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  ),
  Share: (p: P) => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  ),
  Qr: (p: P) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...p}>
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1" />
    </svg>
  ),
  Briefcase: (p: P) => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} {...p}>
      <rect width="20" height="14" x="2" y="7" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Send: (p: P) => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} {...p}>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
    </svg>
  ),
  Star: (p: P) => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} {...p}>
      <path d="M11.5 1.5 14 7.5 20.5 8.3 15.7 12.8 17 19.2 11.5 16 6 19.2l1.3-6.4-4.8-4.5L9 7.5z" />
    </svg>
  ),
}
