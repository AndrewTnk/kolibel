/** Иконки чата (stroke-based, currentColor). */
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const ChatIco = {
  search: (p: P) => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  plus: (p: P) => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} strokeWidth={2.6} {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  close: (p: P) => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  attach: (p: P) => (
    <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
      <path d="M21 11.5 12.5 20a5.5 5.5 0 0 1-7.8-7.8l9.2-9.2a3.7 3.7 0 1 1 5.2 5.2l-9.2 9.2a1.9 1.9 0 0 1-2.7-2.7l8.5-8.5" />
    </svg>
  ),
  smile: (p: P) => (
    <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  mic: (p: P) => (
    <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  ),
  send: (p: P) => (
    <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" />
    </svg>
  ),
  phone: (p: P) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} {...p}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  video: (p: P) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} {...p}>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3z" />
    </svg>
  ),
  more: (p: P) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth={2.2} {...p}>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  ),
  pin: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14l-1.5-2V9a5.5 5.5 0 0 0-11 0v6L5 17z" />
    </svg>
  ),
  mute: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ),
  trash: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  reply: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  ),
  forward: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
      <polyline points="15 17 20 12 15 7" />
      <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
    </svg>
  ),
  copy: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  edit: (p: P) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  photo: (p: P) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 16l5-5 4 4 3-3 6 6" />
      <circle cx="8.5" cy="9" r="1.5" fill="currentColor" />
    </svg>
  ),
  doc: (p: P) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} {...p}>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v4h4" />
    </svg>
  ),
  loc: (p: P) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} {...p}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  contact: (p: P) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  briefcase: (p: P) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} {...p}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  check1: (p: P) => (
    <svg width="14" height="11" viewBox="0 0 14 11" {...s} strokeWidth={1.8} {...p}>
      <polyline points="1 6 5 10 13 1" />
    </svg>
  ),
  check2: (p: P) => (
    <svg width="16" height="11" viewBox="0 0 16 11" {...s} strokeWidth={1.8} {...p}>
      <polyline points="1 6 5 10 13 1" />
      <polyline points="5 10 9 6" />
      <polyline points="9 6 15 1" />
    </svg>
  ),
  expand: (p: P) => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
      <path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7" />
    </svg>
  ),
  chat: (p: P) => (
    <svg width="22" height="22" viewBox="0 0 24 24" {...s} {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
}
