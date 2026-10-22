// Keyboard commands. Registered with the host's shortcut service when available (so they show
// up in Settings → Shortcuts and can be rebound); otherwise a document-level listener applies
// the same defaults. "primary" is ⌘ on macOS and Ctrl on Windows/Linux.
import type { ClientShortcuts, ShortcutBinding } from '../dsh-types.d.ts'
import type { MessageKey, Translate } from './locale.ts'
import type { Placed, SplitController } from './store.ts'

export interface CommandSpec {
  readonly id: string
  readonly label: MessageKey
  readonly aliases: readonly string[]
  readonly binding: ShortcutBinding
  readonly whileSplit: boolean
  readonly run: (controller: SplitController) => void
}

export const COMMANDS: readonly CommandSpec[] = [
  { id: 'conversation-split.split-right', label: 'shortcut.splitRight', aliases: ['split', 'side by side', '分屏'], binding: { code: 'KeyD', modifiers: ['primary', 'shift'] }, whileSplit: false, run: (c) => c.splitPane('right') },
  { id: 'conversation-split.split-down', label: 'shortcut.splitDown', aliases: ['split', 'stack', '分屏'], binding: { code: 'KeyE', modifiers: ['primary', 'shift'] }, whileSplit: false, run: (c) => c.splitPane('bottom') },
  { id: 'conversation-split.close-pane', label: 'shortcut.close', aliases: ['split', 'close pane'], binding: { code: 'KeyW', modifiers: ['primary', 'shift'] }, whileSplit: true, run: (c) => { const s = c.getSnapshot(); if (s) c.closePane(s.focus) } },
  { id: 'conversation-split.zoom-pane', label: 'shortcut.zoom', aliases: ['split', 'maximize', 'zoom'], binding: { code: 'Enter', modifiers: ['primary', 'shift'] }, whileSplit: true, run: (c) => c.toggleZoom() },
  { id: 'conversation-split.next-pane', label: 'shortcut.next', aliases: ['split', 'pane'], binding: { code: 'BracketRight', modifiers: ['primary', 'shift'] }, whileSplit: true, run: (c) => c.focusStep(1) },
  { id: 'conversation-split.previous-pane', label: 'shortcut.previous', aliases: ['split', 'pane'], binding: { code: 'BracketLeft', modifiers: ['primary', 'shift'] }, whileSplit: true, run: (c) => c.focusStep(-1) },
  { id: 'conversation-split.focus-left', label: 'shortcut.left', aliases: ['split', 'pane'], binding: { code: 'ArrowLeft', modifiers: ['primary', 'alt'] }, whileSplit: true, run: (c) => c.focusDirection('left', currentPlacement()) },
  { id: 'conversation-split.focus-right', label: 'shortcut.right', aliases: ['split', 'pane'], binding: { code: 'ArrowRight', modifiers: ['primary', 'alt'] }, whileSplit: true, run: (c) => c.focusDirection('right', currentPlacement()) },
  { id: 'conversation-split.focus-up', label: 'shortcut.up', aliases: ['split', 'pane'], binding: { code: 'ArrowUp', modifiers: ['primary', 'alt'] }, whileSplit: true, run: (c) => c.focusDirection('top', currentPlacement()) },
  { id: 'conversation-split.focus-down', label: 'shortcut.down', aliases: ['split', 'pane'], binding: { code: 'ArrowDown', modifiers: ['primary', 'alt'] }, whileSplit: true, run: (c) => c.focusDirection('bottom', currentPlacement()) },
]

let placement: readonly Placed[] = []
export const publishPlacement = (placed: readonly Placed[]): void => { placement = placed }
const currentPlacement = (): readonly Placed[] => placement

export const isMac = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** Human-readable keycaps for menus, e.g. "⇧⌘D" on macOS, "Ctrl+Shift+D" elsewhere. */
export function formatBinding(binding: ShortcutBinding): string {
  const key = binding.code.replace(/^Key|^Digit/, '').replace('BracketRight', ']').replace('BracketLeft', '[').replace('Enter', '↵').replace(/^Arrow/, '')
  if (isMac()) {
    const order = ['control', 'alt', 'shift', 'primary', 'meta']
    const glyph: Record<string, string> = { control: '⌃', alt: '⌥', shift: '⇧', primary: '⌘', meta: '⌘' }
    return [...binding.modifiers].sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((m) => glyph[m]).join('') + key
  }
  const name: Record<string, string> = { control: 'Ctrl', alt: 'Alt', shift: 'Shift', primary: 'Ctrl', meta: 'Win' }
  return [...binding.modifiers.map((m) => name[m]), key].join('+')
}

function matches(event: KeyboardEvent, binding: ShortcutBinding): boolean {
  const mac = isMac()
  const want = new Set(binding.modifiers.map((m) => (m === 'primary' ? (mac ? 'meta' : 'control') : m)))
  return (
    event.code === binding.code &&
    event.metaKey === want.has('meta') &&
    event.ctrlKey === want.has('control') &&
    event.altKey === want.has('alt') &&
    event.shiftKey === want.has('shift')
  )
}

/** Register every command; returns a disposer. Falls back per command when the host refuses. */
export function registerShortcuts(shortcuts: ClientShortcuts | undefined, controller: SplitController, t: Translate): () => void {
  const disposers: (() => unknown)[] = []
  const fallback: CommandSpec[] = []
  for (const spec of COMMANDS) {
    if (shortcuts === undefined) { fallback.push(spec); continue }
    try {
      disposers.push(
        shortcuts.register({
          id: spec.id,
          label: () => t(spec.label),
          aliases: spec.aliases,
          defaults: { [`${shortcuts.runtime}:${shortcuts.platform}`]: spec.binding },
          regions: ['page', 'editable'],
          modals: [],
          resolve: () =>
            spec.whileSplit && controller.getSnapshot() === null
              ? { status: 'pass' }
              : { status: 'handled', run: () => spec.run(controller) },
        }),
      )
    } catch (error) {
      console.warn('[dsh-conversation-split] shortcut service refused', spec.id, error)
      fallback.push(spec)
    }
  }
  if (fallback.length > 0) {
    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return
      for (const spec of fallback) {
        if (!matches(event, spec.binding)) continue
        if (spec.whileSplit && controller.getSnapshot() === null) return
        event.preventDefault()
        event.stopPropagation()
        spec.run(controller)
        return
      }
    }
    document.addEventListener('keydown', onKey, true)
    disposers.push(() => document.removeEventListener('keydown', onKey, true))
  }
  return () => { for (const d of disposers) d() }
}
