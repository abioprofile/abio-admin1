import type { CSSProperties } from 'react'
const paths = {
  gift: 'M3 8h18v4H3V8Z M5 12v9h14v-9 M12 8v13 M12 8S10 3 7.5 4.5 8 8 12 8Zm0 0s2-5 4.5-3.5S16 8 12 8Z',
  business: 'M3 7h18v14H3V7Z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3',
  themes:
    'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4c-1-1 0-3 2-3h2a3 3 0 0 0 3-3 9 9 0 0 0-9-8Z M7 10h.01 M10 6h.01 M15 7h.01 M6 14h.01',
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  products: 'm12 3 9 5-9 5-9-5 9-5Z M3 8v9l9 5 9-5V8 M12 13v9 M7.5 5.5l9 5',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Z M9 8h6 M9 12h6',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  verification: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z m-4 9 3 3 5-6',
  invites: 'M3 5h18v14H3V5Z m0 1 9 7 9-7',
  logout: 'M9 21H4V3h5 M9 12h12 m-4-4 4 4-4 4',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'm6 6 12 12 M6 18 18 6',
  plus: 'M12 5v14 M5 12h14',
  search: 'M19 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z m-2 5 5 6',
  arrow: 'M19 12H5 m6-6-6 6 6 6',
  external: 'M14 3h7v7 M21 3l-10 10 M10 3H3v18h18v-7',
  edit: 'm16 3 5 5-12 12-6 1 1-6L16 3Z m-2 2 5 5',
} as const
export type IconName = keyof typeof paths
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName
  size?: number
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  )
}
