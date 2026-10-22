// Layout state and the actions the UI, shortcuts and host hooks share. One store per client.
import { parseLayout, serializeLayout, STORAGE_KEY } from '../layout/storage.ts'
import {
  assignSession, cycle, findPane, leaf, leaves, MAX_PANES, movePane, neighbour, paneOfSession,
  place, removePane, setRatio, splitPane, swapPanes, type Layout, type Leaf, type PaneId, type Placed,
  type Rect, type SessionId, type Side,
} from '../layout/tree.ts'

export interface HostPorts {
  /** Make the host's main selection follow the focused pane (sidebar highlight, right panel). */
  openSession(sessionId: SessionId): void
  /** Session shown by the host before the split opened; seeds the first pane. */
  mainSession(): SessionId | undefined
  createSession(near: SessionId | undefined): Promise<SessionId>
  notify(kind: 'paneLimit' | 'createFailed'): void
  readStorage(): string | null
  writeStorage(value: string | null): void
}

export interface SplitController {
  getSnapshot(): Layout | null
  subscribe(listener: () => void): () => void
  /** Open the split (if closed) and add a pane on `side` of the target (default: focused). */
  splitPane(side: Side, sessionId?: SessionId | null, target?: PaneId): void
  newBeside(side: Side, target?: PaneId): Promise<void>
  /** Create a conversation and show it in an existing (usually empty) pane. */
  newBesideInPane(paneId: PaneId): Promise<void>
  openInSplit(sessionId: SessionId): void
  assign(paneId: PaneId, sessionId: SessionId | null): void
  closePane(paneId: PaneId): void
  closeAll(): void
  focus(paneId: PaneId): void
  focusStep(delta: 1 | -1): void
  focusDirection(side: Side, placed: readonly Placed[]): void
  toggleZoom(paneId?: PaneId): void
  resize(path: readonly number[], ratio: number): void
  move(source: PaneId, target: PaneId, side: Side): void
  swap(a: PaneId, b: PaneId): void
  /** Drop panes whose Session disappeared (archived / deleted elsewhere). */
  reconcile(known: ReadonlySet<SessionId>): void
}

let seq = 0
const newPaneId = (): PaneId => `p${Date.now().toString(36)}${(seq++).toString(36)}`

export function createSplitController(host: HostPorts): SplitController {
  let state: Layout | null = parseLayout(host.readStorage())
  if (state !== null && leaves(state.root).length < 2) state = null
  const listeners = new Set<() => void>()

  const commit = (next: Layout | null): void => {
    const previousFocus = state === null ? undefined : findPane(state.root, state.focus)?.sessionId
    state = next
    host.writeStorage(next === null ? null : serializeLayout(next))
    for (const l of listeners) l()
    const focused = next === null ? undefined : findPane(next.root, next.focus)?.sessionId
    if (focused !== undefined && focused !== null && focused !== previousFocus) host.openSession(focused)
  }

  const ensureOpen = (): Layout => {
    if (state !== null) return state
    const first = leaf(newPaneId(), host.mainSession() ?? null)
    return { root: first, focus: first.id, zoom: null }
  }

  const doSplit = (side: Side, sessionId: SessionId | null, target?: PaneId): PaneId | undefined => {
    const base = ensureOpen()
    const at = target ?? base.focus
    const fresh = leaf(newPaneId(), sessionId)
    const root = splitPane(base.root, at, side, fresh)
    if (root === undefined) {
      if (leaves(base.root).length >= MAX_PANES) host.notify('paneLimit')
      return undefined
    }
    commit({ root, focus: fresh.id, zoom: null })
    return fresh.id
  }

  const controller: SplitController = {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    splitPane(side, sessionId = null, target) {
      doSplit(side, sessionId, target)
    },
    async newBeside(side, target) {
      const near = state === null ? host.mainSession() : findPane(state.root, target ?? state.focus)?.sessionId ?? undefined
      const paneId = doSplit(side, null, target)
      if (paneId === undefined) return
      try {
        const created = await host.createSession(near)
        controller.assign(paneId, created)
      } catch (error) {
        console.error('[dsh-conversation-split] create failed', error)
        host.notify('createFailed')
        controller.closePane(paneId)
      }
    },
    async newBesideInPane(paneId) {
      if (state === null) return
      const near = leaves(state.root).find((l) => l.id !== paneId && l.sessionId !== null)?.sessionId ?? host.mainSession()
      try {
        const created = await host.createSession(near ?? undefined)
        controller.assign(paneId, created)
      } catch (error) {
        console.error('[dsh-conversation-split] create failed', error)
        host.notify('createFailed')
      }
    },
    openInSplit(sessionId) {
      if (state !== null) {
        const existing = paneOfSession(state.root, sessionId)
        if (existing !== undefined) return controller.focus(existing.id)
        const empty = leaves(state.root).find((l) => l.sessionId === null)
        if (empty !== undefined) return controller.assign(empty.id, sessionId)
      }
      doSplit('right', sessionId)
    },
    assign(paneId, sessionId) {
      if (state === null) return
      if (sessionId !== null) {
        const other = paneOfSession(state.root, sessionId)
        if (other !== undefined && other.id !== paneId) {
          commit({ ...state, root: swapPanes(state.root, paneId, other.id), focus: paneId })
          return
        }
      }
      commit({ ...state, root: assignSession(state.root, paneId, sessionId), focus: paneId })
    },
    closePane(paneId) {
      if (state === null) return
      const root = removePane(state.root, paneId)
      if (root === undefined || leaves(root).length < 2) {
        // One pane left: leave split mode and let the host show that conversation.
        const survivor = root === undefined ? undefined : (leaves(root)[0] as Leaf | undefined)
        commit(null)
        if (survivor?.sessionId) host.openSession(survivor.sessionId)
        return
      }
      const focus = findPane(root, state.focus) ? state.focus : (leaves(root)[0] as Leaf).id
      commit({ root, focus, zoom: state.zoom !== null && findPane(root, state.zoom) ? state.zoom : null })
    },
    closeAll() {
      if (state === null) return
      const focused = findPane(state.root, state.focus)?.sessionId
      commit(null)
      if (focused) host.openSession(focused)
    },
    focus(paneId) {
      if (state === null || state.focus === paneId || findPane(state.root, paneId) === undefined) return
      commit({ ...state, focus: paneId })
    },
    focusStep(delta) {
      if (state === null) return
      controller.focus(cycle(state.root, state.focus, delta))
    },
    focusDirection(side, placed) {
      if (state === null) return
      const next = neighbour(placed, state.focus, side)
      if (next !== undefined) controller.focus(next)
    },
    toggleZoom(paneId) {
      if (state === null) return
      const id = paneId ?? state.focus
      commit({ ...state, focus: id, zoom: state.zoom === id ? null : id })
    },
    resize(path, ratio) {
      if (state === null) return
      commit({ ...state, root: setRatio(state.root, path, ratio) })
    },
    move(source, target, side) {
      if (state === null) return
      const root = movePane(state.root, source, target, side)
      if (root !== undefined) commit({ ...state, root, focus: source })
    },
    swap(a, b) {
      if (state === null) return
      commit({ ...state, root: swapPanes(state.root, a, b) })
    },
    reconcile(known) {
      if (state === null) return
      let root = state.root
      for (const pane of leaves(root)) {
        if (pane.sessionId !== null && !known.has(pane.sessionId)) root = assignSession(root, pane.id, null)
      }
      if (root !== state.root) commit({ ...state, root })
    },
  }
  return controller
}

export { place, type Layout, type Placed, type Rect, type Side }
