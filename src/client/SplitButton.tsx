import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Glyph } from './glyphs.tsx'
import type { Translate } from './locale.ts'
import { COMMANDS, formatBinding } from './shortcuts.ts'
import type { SplitController } from './store.ts'

/** Header utility: click splits right, the caret opens a menu with every split action. */
export function SplitButton({ controller, t }: { readonly controller: SplitController; readonly t: Translate }): ReactNode {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent): void => { if (ref.current && !ref.current.contains(e.target as globalThis.Node)) setOpen(false) }
    const key = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('keydown', key, true)
    return () => { document.removeEventListener('pointerdown', down, true); document.removeEventListener('keydown', key, true) }
  }, [open])
  const keys = (id: string): string => formatBinding(COMMANDS.find((c) => c.id === id)!.binding)
  const item = (label: string, cmd: string, glyph: Parameters<typeof Glyph>[0]['name'], run: () => void): ReactNode => (
    <button type="button" className="dcs-menu-item" role="menuitem" onClick={() => { setOpen(false); run() }}>
      <Glyph name={glyph} /><span>{label}</span><kbd>{keys(cmd)}</kbd>
    </button>
  )
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        className="dcs-btn"
        data-split-header-button=""
        title={`${t('header.split')} (${keys('conversation-split.split-right')})`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => (e.shiftKey || e.altKey ? controller.splitPane('bottom') : setOpen((v) => !v))}
      >
        <Glyph name="splitRight" />
      </button>
      {open && (
        <div className="dcs-menu" role="menu" style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4 }}>
          {item(t('menu.splitRight'), 'conversation-split.split-right', 'splitRight', () => controller.splitPane('right'))}
          {item(t('menu.splitDown'), 'conversation-split.split-down', 'splitDown', () => controller.splitPane('bottom'))}
          <div className="dcs-menu-sep" />
          {item(t('pane.newBeside'), 'conversation-split.split-right', 'plus', () => void controller.newBeside('right'))}
        </div>
      )}
    </div>
  )
}
