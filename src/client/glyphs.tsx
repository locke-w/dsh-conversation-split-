import type { ReactNode } from 'react'

const PATHS = {
  splitRight: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M12 4v16" /></>,
  splitDown: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 12h18" /></>,
  maximize: <><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M21 16v3a2 2 0 0 1-2 2h-3" /></>,
  restore: <><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M16 3v3a2 2 0 0 0 2 2h3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /></>,
  close: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
  chevron: <path d="M6 9l6 6 6-6" />,
  sidebar: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />,
}

export function Glyph({ name }: { readonly name: keyof typeof PATHS }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', flex: 'none' }}>
      {PATHS[name]}
    </svg>
  )
}
