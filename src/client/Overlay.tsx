// The split surface: a root-scoped `shell.overlay` entry that draws every pane over the box of
// the placeholder shadowing `main.conversation`. Pane chrome follows Antigravity's split view:
// a slim title bar with split / maximize / close, auto-hidden on narrow unfocused panes.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { ClientSessions, RootSlotProps } from '../dsh-types.d.ts'
import { leaves, nodeAt, type Leaf, type Node, type PaneId, type Side } from '../layout/tree.ts'
import type { AnchorStore } from './anchor.ts'
import { COMMANDS, formatBinding, publishPlacement } from './shortcuts.ts'
import type { Translate } from './locale.ts'
import { PaneSession } from './PaneSession.tsx'
import { place, type Placed, type Rect, type SplitController } from './store.ts'
import { Glyph } from './glyphs.tsx'
import type { ToastStore } from './toast.ts'

const NARROW_PX = 440
const TIGHT_PX = 260
const DRAG_THRESHOLD = 6

export interface OverlayProps extends Omit<RootSlotProps, 't'> {
  readonly controller: SplitController
  readonly anchor: AnchorStore
  readonly sessions: ClientSessions
  readonly toast: ToastStore
  readonly t: Translate
  readonly toggleSidebar: () => void
}

interface Menu {
  readonly kind: 'picker' | 'actions'
  readonly paneId: PaneId
  readonly x: number
  readonly y: number
}

interface Drag {
  readonly source: PaneId
  readonly target?: PaneId
  readonly side?: Side
}

function sideOf(rect: Rect, x: number, y: number): Side {
  const dx = (x - rect.left) / rect.width - 0.5
  const dy = (y - rect.top) / rect.height - 0.5
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right'
  return dy < 0 ? 'top' : 'bottom'
}

function dropRect(rect: Rect, side: Side): Rect {
  switch (side) {
    case 'left': return { ...rect, width: rect.width / 2 }
    case 'right': return { ...rect, left: rect.left + rect.width / 2, width: rect.width / 2 }
    case 'top': return { ...rect, height: rect.height / 2 }
    case 'bottom': return { ...rect, top: rect.top + rect.height / 2, height: rect.height / 2 }
  }
}

export function SplitOverlay(props: OverlayProps): ReactNode {
  const { controller, anchor, t } = props
  const layout = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const box = useAnchorRect(anchor)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [resizing, setResizing] = useState<'row' | 'column' | null>(null)
  const toastText = useSyncExternalStore(props.toast.subscribe, props.toast.getSnapshot)

  const placement = useMemo(() => (layout && box ? place(layout, { left: 0, top: 0, width: box.width, height: box.height }) : null), [layout, box])
  useEffect(() => {
    publishPlacement(placement?.panes ?? [])
  }, [placement])
  useEffect(() => {
    if (layout === null) setMenu(null)
  }, [layout])

  if (layout === null || box === null || placement === null) return toastText ? <div className="dcs-toast">{toastText}</div> : null

  const single = placement.panes.length === 1
  return (
    <div
      className="dcs-root"
      data-resizing={resizing ?? undefined}
      data-single={single ? '' : undefined}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      onPointerDownCapture={(event) => {
        const paneEl = (event.target as HTMLElement).closest<HTMLElement>('[data-pane-id]')
        if (paneEl?.dataset.paneId) controller.focus(paneEl.dataset.paneId)
      }}
    >
      {placement.panes.map(({ pane, rect }) => (
        <Pane
          key={pane.id}
          pane={pane}
          rect={rect}
          active={layout.focus === pane.id}
          zoomed={layout.zoom === pane.id}
          dragging={drag?.source === pane.id}
          panes={placement.panes}
          onMenu={(kind, x, y) => setMenu({ kind, paneId: pane.id, x, y })}
          onDrag={setDrag}
          {...props}
        />
      ))}
      {placement.dividers.map((d) => (
        <Divider key={d.path.join('.')} path={d.path} axis={d.axis} rect={d.rect} box={box} controller={controller} onResizing={setResizing} />
      ))}
      {drag?.target && drag.side && (() => {
        const target = placement.panes.find((p) => p.pane.id === drag.target)
        return target ? <div className="dcs-drop" style={dropRect(target.rect, drag.side)} /> : null
      })()}
      {menu && (menu.kind === 'picker'
        ? <Picker {...props} paneId={menu.paneId} x={menu.x} y={menu.y} onClose={() => setMenu(null)} />
        : <ActionsMenu controller={controller} layout={layout} paneId={menu.paneId} x={menu.x} y={menu.y} t={t} onClose={() => setMenu(null)} />)}
      {toastText && <div className="dcs-toast">{toastText}</div>}
    </div>
  )
}

interface PaneProps extends OverlayProps {
  readonly pane: Leaf
  readonly rect: Rect
  readonly active: boolean
  readonly zoomed: boolean
  readonly dragging: boolean
  readonly panes: readonly Placed[]
  readonly onMenu: (kind: Menu['kind'], x: number, y: number) => void
  readonly onDrag: (drag: Drag | null) => void
}

function Pane({ pane, rect, active, zoomed, dragging, panes, onMenu, onDrag, controller, sessions, t, useSessions, useSessionStatus, SessionProvider, renderSlot, toggleSidebar }: PaneProps): ReactNode {
  const title = useSessions((s) => (pane.sessionId ? s.byId[pane.sessionId]?.title : undefined))
  const running = useSessionStatus((m) => (pane.sessionId ? m.get(pane.sessionId)?.running === true : false))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (active && ref.current && !ref.current.contains(document.activeElement)) {
      const editor = ref.current.querySelector<HTMLElement>('textarea, [contenteditable="true"]')
      if (editor && document.activeElement === document.body) editor.focus({ preventScroll: true })
    }
  }, [active, pane.sessionId])

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0 || panes.length < 2) return
    const startX = event.clientX
    const startY = event.clientY
    let started = false
    let current: Drag = { source: pane.id }
    const root = ref.current?.parentElement
    const move = (e: PointerEvent): void => {
      if (!started) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return
        started = true
        onDrag(current)
      }
      const origin = root?.getBoundingClientRect()
      if (!origin) return
      const x = e.clientX - origin.left
      const y = e.clientY - origin.top
      const hit = panes.find((p) => p.pane.id !== pane.id && x >= p.rect.left && x <= p.rect.left + p.rect.width && y >= p.rect.top && y <= p.rect.top + p.rect.height)
      current = hit ? { source: pane.id, target: hit.pane.id, side: sideOf(hit.rect, x, y) } : { source: pane.id }
      onDrag(current)
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      onDrag(null)
      if (started && current.target && current.side) controller.move(pane.id, current.target, current.side)
      else if (!started) onMenu('picker', startX, startY + 8)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const label = pane.sessionId ? (title && title.trim() !== '' ? title : t('pane.untitled')) : t('pane.empty')
  const shortcut = (id: string): string => formatBinding(COMMANDS.find((c) => c.id === id)!.binding)

  return (
    <div
      ref={ref}
      className="dcs-pane"
      data-pane-id={pane.id}
      data-active={active ? '' : undefined}
      data-narrow={rect.width < NARROW_PX ? '' : undefined}
      data-tight={rect.width < TIGHT_PX ? '' : undefined}
      data-drag-source={dragging ? '' : undefined}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, opacity: dragging ? 0.55 : undefined }}
      onContextMenu={(event) => {
        if ((event.target as HTMLElement).closest('.dcs-pane-head')) {
          event.preventDefault()
          onMenu('actions', event.clientX, event.clientY)
        }
      }}
    >
      <div className="dcs-pane-head" data-window-drag="">
        <button type="button" className="dcs-title" title={t('pane.switch')} onPointerDown={startDrag}>
          {running && <span className="dcs-dot" title={t('pane.running')} />}
          <span className="dcs-title-text">{label}</span>
          <Glyph name="chevron" />
        </button>
        <div className="dcs-actions">
          <button type="button" className="dcs-btn" title={`${t('pane.splitRight')} (${shortcut('conversation-split.split-right')})`} onClick={() => controller.splitPane('right', null, pane.id)}><Glyph name="splitRight" /></button>
          <button type="button" className="dcs-btn" title={`${t('pane.splitDown')} (${shortcut('conversation-split.split-down')})`} onClick={() => controller.splitPane('bottom', null, pane.id)}><Glyph name="splitDown" /></button>
          <button type="button" className="dcs-btn" title={`${zoomed ? t('pane.restore') : t('pane.maximize')} (${shortcut('conversation-split.zoom-pane')})`} onClick={() => controller.toggleZoom(pane.id)}><Glyph name={zoomed ? 'restore' : 'maximize'} /></button>
          <button type="button" className="dcs-btn" title={`${t('pane.close')} (${shortcut('conversation-split.close-pane')})`} onClick={() => controller.closePane(pane.id)}><Glyph name="close" /></button>
          {active && <button type="button" className="dcs-btn dcs-btn-sidebar" title={t('pane.sidebar')} onClick={toggleSidebar}><Glyph name="sidebar" /></button>}
        </div>
      </div>
      {pane.sessionId === null ? (
        <div className="dcs-note">
          <span>{t('pane.empty')}</span>
          <button type="button" onClick={(e) => onMenu('picker', e.clientX, e.clientY)}>{t('pane.switch')}</button>
          <button type="button" onClick={() => void controller.newBesideInPane(pane.id)}>{t('picker.new')}</button>
        </div>
      ) : (
        <PaneSession paneId={pane.id} sessionId={pane.sessionId} sessions={sessions} SessionProvider={SessionProvider} renderSlot={renderSlot} t={t} />
      )}
    </div>
  )
}

function Divider({ path, axis, rect, box, controller, onResizing }: { path: readonly number[]; axis: 'row' | 'column'; rect: Rect; box: Rect; controller: SplitController; onResizing: (a: 'row' | 'column' | null) => void }): ReactNode {
  const [dragging, setDragging] = useState(false)
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return
    event.preventDefault()
    const el = event.currentTarget
    const parent = el.parentElement
    if (!parent) return
    const snapshot = controller.getSnapshot()
    if (!snapshot) return
    const placed = place(snapshot, { left: 0, top: 0, width: box.width, height: box.height })
    const node = nodeRect(placed.panes, path, snapshot)
    if (!node) return
    setDragging(true)
    onResizing(axis)
    const origin = parent.getBoundingClientRect()
    const move = (e: PointerEvent): void => {
      const ratio = axis === 'row' ? (e.clientX - origin.left - node.left) / node.width : (e.clientY - origin.top - node.top) / node.height
      controller.resize(path, ratio)
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setDragging(false)
      onResizing(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  return (
    <div
      className="dcs-divider"
      data-axis={axis}
      data-dragging={dragging ? '' : undefined}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      onPointerDown={onPointerDown}
      onDoubleClick={() => controller.resize(path, 0.5)}
    />
  )
}

/** Bounding box of the subtree at `path`: the union of its panes' rects. */
function nodeRect(panes: readonly Placed[], path: readonly number[], layout: { root: Node }): Rect | undefined {
  const node = nodeAt(layout.root, path)
  if (!node) return undefined
  const ids = new Set(leaves(node).map((l) => l.id))
  const rects = panes.filter((p) => ids.has(p.pane.id)).map((p) => p.rect)
  if (rects.length === 0) return undefined
  const left = Math.min(...rects.map((r) => r.left))
  const top = Math.min(...rects.map((r) => r.top))
  const right = Math.max(...rects.map((r) => r.left + r.width))
  const bottom = Math.max(...rects.map((r) => r.top + r.height))
  return { left, top, width: right - left, height: bottom - top }
}

function useDismiss(onClose: () => void, ref: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const down = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) onClose()
    }
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('keydown', key, true)
    }
  }, [onClose, ref])
}

function clampToViewport(x: number, y: number, width: number, height: number): { left: number; top: number } {
  return {
    left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
    top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
  }
}

function Picker({ controller, paneId, x, y, onClose, t, useSessions, useSessionStatus }: OverlayProps & { paneId: PaneId; x: number; y: number; onClose: () => void }): ReactNode {
  const list = useSessions((s) => s)
  const statuses = useSessionStatus((m) => m)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(onClose, ref)
  const snapshot = controller.getSnapshot()
  const inUse = new Set((snapshot ? leaves(snapshot.root) : []).map((l) => l.sessionId))
  const items = list.ids
    .map((id) => ({ id, summary: list.byId[id] }))
    .filter(({ summary }) => summary && !summary.archived)
    .filter(({ id, summary }) => {
      const q = query.trim().toLowerCase()
      return q === '' || id.toLowerCase().includes(q) || (summary?.title ?? '').toLowerCase().includes(q)
    })
    .slice(0, 200)
  const pos = clampToViewport(x, y, 300, 400)
  return (
    <div ref={ref} className="dcs-menu" style={{ left: pos.left, top: pos.top, width: 300 }} role="menu">
      <input autoFocus className="dcs-menu-search" placeholder={t('picker.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      <button type="button" className="dcs-menu-item" onClick={() => { onClose(); void controller.newBesideInPane(paneId) }}>
        <Glyph name="plus" /><span>{t('picker.new')}</span>
      </button>
      <div className="dcs-menu-sep" />
      <div className="dcs-menu-list">
        {items.length === 0 && <div className="dcs-menu-item" aria-disabled>{t('picker.none')}</div>}
        {items.map(({ id, summary }) => (
          <button key={id} type="button" className="dcs-menu-item" data-active={inUse.has(id) ? '' : undefined} onClick={() => { onClose(); controller.assign(paneId, id) }}>
            {statuses.get(id)?.running ? <span className="dcs-dot" /> : <Glyph name="chat" />}
            <span>{summary?.title?.trim() || t('pane.untitled')}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ActionsMenu({ controller, layout, paneId, x, y, t, onClose }: { controller: SplitController; layout: { zoom: PaneId | null }; paneId: PaneId; x: number; y: number; t: Translate; onClose: () => void }): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(onClose, ref)
  const pos = clampToViewport(x, y, 220, 200)
  const item = (label: string, cmd: string, run: () => void, glyph: Parameters<typeof Glyph>[0]['name']): ReactNode => (
    <button type="button" className="dcs-menu-item" onClick={() => { onClose(); run() }}>
      <Glyph name={glyph} /><span>{label}</span><kbd>{formatBinding(COMMANDS.find((c) => c.id === cmd)!.binding)}</kbd>
    </button>
  )
  return (
    <div ref={ref} className="dcs-menu" style={pos} role="menu">
      {item(t('pane.splitRight'), 'conversation-split.split-right', () => controller.splitPane('right', null, paneId), 'splitRight')}
      {item(t('pane.splitDown'), 'conversation-split.split-down', () => controller.splitPane('bottom', null, paneId), 'splitDown')}
      {item(layout.zoom === paneId ? t('pane.restore') : t('pane.maximize'), 'conversation-split.zoom-pane', () => controller.toggleZoom(paneId), layout.zoom === paneId ? 'restore' : 'maximize')}
      <div className="dcs-menu-sep" />
      {item(t('pane.close'), 'conversation-split.close-pane', () => controller.closePane(paneId), 'close')}
    </div>
  )
}

function useAnchorRect(anchor: AnchorStore): Rect | null {
  const element = useSyncExternalStore(anchor.subscribe, anchor.get)
  const [rect, setRect] = useState<Rect | null>(null)
  const measure = useCallback((): Rect | null => {
    if (!element || !element.isConnected) return null
    const b = element.getBoundingClientRect()
    return b.width === 0 && b.height === 0 ? null : { left: b.left, top: b.top, width: b.width, height: b.height }
  }, [element])
  useLayoutEffect(() => {
    let last: Rect | null = null
    const update = (): void => {
      const next = measure()
      if ((last === null) !== (next === null) || (last && next && (last.left !== next.left || last.top !== next.top || last.width !== next.width || last.height !== next.height))) {
        last = next
        setRect(next)
      }
    }
    update()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    if (element && ro) ro.observe(element)
    window.addEventListener('resize', update)
    // Sidebar slide animations move the anchor without resizing the window: poll briefly.
    const timer = setInterval(update, 250)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', update)
      clearInterval(timer)
    }
  }, [element, measure])
  return rect
}
