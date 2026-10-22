import { useCallback, type ReactNode } from 'react'
import { Glyph } from './glyphs.tsx'
import type { Translate } from './locale.ts'

export interface SessionMenuItemProps {
  readonly sessionId: string
  readonly useMenuOpenState?: () => readonly [boolean, (open: boolean) => void]
  readonly openInSplit: (sessionId: string) => void
  readonly t: Translate
}

/** Copies a shipped sibling row's classes so the entry matches the host's session menu. */
function adoptSiblingClass(button: HTMLButtonElement | null): void {
  if (button === null) return
  const sibling = [...(button.parentElement?.querySelectorAll('[role="menuitem"]') ?? [])].find(
    (el) => el !== button && !el.classList.contains('dcs-menu-item'),
  )
  if (sibling === undefined || sibling.className === '') return
  button.className = sibling.className
  const [icon, label] = sibling.children
  const [ownIcon, ownLabel] = button.children
  if (icon && ownIcon && icon.className !== '') ownIcon.className = icon.className
  if (label && ownLabel && label.className !== '') ownLabel.className = label.className
}

export function SessionMenuItem({ sessionId, useMenuOpenState, openInSplit, t }: SessionMenuItemProps): ReactNode {
  const state = useMenuOpenState?.()
  const close = state?.[1]
  const ref = useCallback(adoptSiblingClass, [])
  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      className="dcs-menu-item"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        close?.(false)
        openInSplit(sessionId)
      }}
    >
      <span style={{ display: 'inline-flex' }}><Glyph name="splitRight" /></span>
      <span>{t('menu.openInSplit')}</span>
    </button>
  )
}
