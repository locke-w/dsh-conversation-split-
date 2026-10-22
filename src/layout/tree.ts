// Pure layout model: a binary tree of panes. Every inner node splits its box along one axis
// ("row" = side by side, "column" = stacked) at `ratio` (share of the first child).
export type PaneId = string
export type SessionId = string
export type Axis = 'row' | 'column'
export type Side = 'left' | 'right' | 'top' | 'bottom'

export interface Leaf {
  readonly kind: 'leaf'
  readonly id: PaneId
  readonly sessionId: SessionId | null
}

export interface Split {
  readonly kind: 'split'
  readonly axis: Axis
  readonly ratio: number
  readonly first: Node
  readonly second: Node
}

export type Node = Leaf | Split

export interface Layout {
  readonly root: Node
  readonly focus: PaneId
  /** Pane shown alone (Antigravity "maximize"); the tree is kept so it can be restored. */
  readonly zoom: PaneId | null
}

export interface Rect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export interface Placed {
  readonly pane: Leaf
  readonly rect: Rect
}

export interface DividerBox {
  readonly path: readonly number[]
  readonly axis: Axis
  readonly rect: Rect
}

export const MIN_RATIO = 0.15
export const MAX_PANES = 8

export const leaf = (id: PaneId, sessionId: SessionId | null = null): Leaf => ({ kind: 'leaf', id, sessionId })

export const clampRatio = (ratio: number): number => Math.min(1 - MIN_RATIO, Math.max(MIN_RATIO, ratio))

export function split(axis: Axis, first: Node, second: Node, ratio = 0.5): Split {
  return { kind: 'split', axis, ratio: clampRatio(ratio), first, second }
}

export function leaves(node: Node): Leaf[] {
  return node.kind === 'leaf' ? [node] : [...leaves(node.first), ...leaves(node.second)]
}

export const paneCount = (node: Node): number => leaves(node).length

export const findPane = (node: Node, id: PaneId): Leaf | undefined => leaves(node).find((l) => l.id === id)

export const paneOfSession = (node: Node, sessionId: SessionId): Leaf | undefined =>
  leaves(node).find((l) => l.sessionId === sessionId)

export function pathOf(node: Node, id: PaneId, prefix: number[] = []): number[] | undefined {
  if (node.kind === 'leaf') return node.id === id ? prefix : undefined
  return pathOf(node.first, id, [...prefix, 0]) ?? pathOf(node.second, id, [...prefix, 1])
}

export function nodeAt(node: Node, path: readonly number[]): Node | undefined {
  let cur: Node | undefined = node
  for (const step of path) {
    if (cur === undefined || cur.kind !== 'split') return undefined
    cur = step === 0 ? cur.first : cur.second
  }
  return cur
}

function replaceAt(node: Node, path: readonly number[], next: (n: Node) => Node): Node {
  if (path.length === 0) return next(node)
  if (node.kind !== 'split') return node
  const [head, ...rest] = path
  return head === 0
    ? { ...node, first: replaceAt(node.first, rest, next) }
    : { ...node, second: replaceAt(node.second, rest, next) }
}

/** Split `target` so the new pane lands on `side` of it; returns the new tree or undefined. */
export function splitPane(root: Node, target: PaneId, side: Side, fresh: Leaf): Node | undefined {
  const path = pathOf(root, target)
  if (path === undefined || paneCount(root) >= MAX_PANES) return undefined
  const axis: Axis = side === 'left' || side === 'right' ? 'row' : 'column'
  const leads = side === 'left' || side === 'top'
  return replaceAt(root, path, (old) => (leads ? split(axis, fresh, old) : split(axis, old, fresh)))
}

/** Remove a pane; the sibling takes its place. Undefined when it was the last pane. */
export function removePane(root: Node, id: PaneId): Node | undefined {
  const path = pathOf(root, id)
  if (path === undefined) return root
  if (path.length === 0) return undefined
  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]
  return replaceAt(root, parentPath, (parent) =>
    parent.kind === 'split' ? (index === 0 ? parent.second : parent.first) : parent,
  )
}

export function assignSession(root: Node, id: PaneId, sessionId: SessionId | null): Node {
  const path = pathOf(root, id)
  return path === undefined ? root : replaceAt(root, path, (n) => (n.kind === 'leaf' ? { ...n, sessionId } : n))
}

export function swapPanes(root: Node, a: PaneId, b: PaneId): Node {
  const la = findPane(root, a)
  const lb = findPane(root, b)
  if (la === undefined || lb === undefined || a === b) return root
  return assignSession(assignSession(root, a, lb.sessionId), b, la.sessionId)
}

export function setRatio(root: Node, path: readonly number[], ratio: number): Node {
  return replaceAt(root, path, (n) => (n.kind === 'split' ? { ...n, ratio: clampRatio(ratio) } : n))
}

/** Move a pane next to another (drag & drop): remove then split beside the drop target. */
export function movePane(root: Node, source: PaneId, target: PaneId, side: Side): Node | undefined {
  if (source === target) return root
  const moving = findPane(root, source)
  const without = removePane(root, source)
  if (moving === undefined || without === undefined) return undefined
  return splitPane(without, target, side, moving)
}

export function equalize(node: Node): Node {
  return node.kind === 'leaf' ? node : { ...node, ratio: 0.5, first: equalize(node.first), second: equalize(node.second) }
}

/** Absolute boxes for every pane and divider inside `box`, honouring zoom. */
export function place(layout: Layout, box: Rect, gap = 6): { panes: Placed[]; dividers: DividerBox[] } {
  if (layout.zoom !== null) {
    const pane = findPane(layout.root, layout.zoom)
    if (pane !== undefined) return { panes: [{ pane, rect: box }], dividers: [] }
  }
  const panes: Placed[] = []
  const dividers: DividerBox[] = []
  const walk = (node: Node, rect: Rect, path: number[]): void => {
    if (node.kind === 'leaf') {
      panes.push({ pane: node, rect })
      return
    }
    if (node.axis === 'row') {
      const firstWidth = Math.round((rect.width - gap) * node.ratio)
      walk(node.first, { ...rect, width: firstWidth }, [...path, 0])
      dividers.push({ path, axis: 'row', rect: { left: rect.left + firstWidth, top: rect.top, width: gap, height: rect.height } })
      walk(node.second, { ...rect, left: rect.left + firstWidth + gap, width: rect.width - firstWidth - gap }, [...path, 1])
    } else {
      const firstHeight = Math.round((rect.height - gap) * node.ratio)
      walk(node.first, { ...rect, height: firstHeight }, [...path, 0])
      dividers.push({ path, axis: 'column', rect: { left: rect.left, top: rect.top + firstHeight, width: rect.width, height: gap } })
      walk(node.second, { ...rect, top: rect.top + firstHeight + gap, height: rect.height - firstHeight - gap }, [...path, 1])
    }
  }
  walk(layout.root, box, [])
  return { panes, dividers }
}

/** The pane in `direction` from `from`, by geometry (nearest centre on that side). */
export function neighbour(placed: readonly Placed[], from: PaneId, direction: Side): PaneId | undefined {
  const origin = placed.find((p) => p.pane.id === from)
  if (origin === undefined) return undefined
  const cx = (r: Rect) => r.left + r.width / 2
  const cy = (r: Rect) => r.top + r.height / 2
  let best: { id: PaneId; score: number } | undefined
  for (const p of placed) {
    if (p.pane.id === from) continue
    const dx = cx(p.rect) - cx(origin.rect)
    const dy = cy(p.rect) - cy(origin.rect)
    const ahead =
      direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'top' ? -dy : dy
    if (ahead <= 0) continue
    const score = ahead + Math.abs(direction === 'left' || direction === 'right' ? dy : dx) * 2
    if (best === undefined || score < best.score) best = { id: p.pane.id, score }
  }
  return best?.id
}

export function cycle(root: Node, from: PaneId, delta: 1 | -1): PaneId {
  const ids = leaves(root).map((l) => l.id)
  const index = ids.indexOf(from)
  if (ids.length === 0) return from
  return ids[(index + delta + ids.length) % ids.length] ?? from
}

export function isValidLayout(value: unknown): value is Layout {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const ids = new Set<string>()
  const validNode = (n: unknown): boolean => {
    if (typeof n !== 'object' || n === null) return false
    const node = n as Record<string, unknown>
    if (node.kind === 'leaf') {
      if (typeof node.id !== 'string' || ids.has(node.id)) return false
      ids.add(node.id)
      return node.sessionId === null || typeof node.sessionId === 'string'
    }
    if (node.kind !== 'split') return false
    return (
      (node.axis === 'row' || node.axis === 'column') &&
      typeof node.ratio === 'number' && node.ratio > 0 && node.ratio < 1 &&
      validNode(node.first) && validNode(node.second)
    )
  }
  if (!validNode(v.root)) return false
  if (typeof v.focus !== 'string' || !ids.has(v.focus)) return false
  return v.zoom === null || (typeof v.zoom === 'string' && ids.has(v.zoom))
}
