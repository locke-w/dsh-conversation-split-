// Browser module of dsh-conversation-split. While a split is open, a `main.conversation` shadow
// (priority -1) renders only an anchor; a root-scoped `shell.overlay` entry draws the panes over
// the anchor's box. Each pane retains its own Session and embeds the host's conversation view.
import type { ClientContext, ClientWorkspaces, Disposer } from '../dsh-types.d.ts'
import { MAX_PANES, leaves } from '../layout/tree.ts'
import { createAnchorStore, SplitAnchor } from './anchor.ts'
import { bindTranslate, registerLocale } from './locale.ts'
import { SplitOverlay } from './Overlay.tsx'
import { PANE_SLOT, PaneBody } from './PaneSession.tsx'
import { SessionMenuItem } from './SessionMenuItem.tsx'
import { registerShortcuts } from './shortcuts.ts'
import { SplitButton } from './SplitButton.tsx'
import { createSplitController, type HostPorts } from './store.ts'
import { CSS, PKG } from './styles.ts'
import { createToastStore } from './toast.ts'

export const name = 'dsh-conversation-split'
export const inject = ['slots', 'locale', 'sessions', 'uiWorkspace', 'sidebarRight']

function injectStyle(css: string): () => void {
  document.head.querySelector(`style[data-plugin-css="${PKG}"]`)?.remove()
  const el = document.createElement('style')
  el.dataset.pluginCss = PKG
  el.textContent = css
  document.head.append(el)
  return () => el.remove()
}

function dispose(d: Disposer | { [Symbol.dispose]?: () => void } | undefined | void): void {
  if (typeof d === 'function') d()
  else d?.[Symbol.dispose]?.()
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => registerLocale(ctx), `${PKG}: locale`)
  ctx.effect(() => injectStyle(CSS), `${PKG}: style`)
  const t = bindTranslate(ctx)
  const anchor = createAnchorStore()
  const toast = createToastStore()
  let workspaces: ClientWorkspaces | undefined
  let shadow: Disposer | null = null

  // Draft conversations (the blank "New Session" page) are not retainable until they exist on the host.
  const knownSession = (id: string | undefined): string | undefined =>
    id !== undefined && ctx.sessions.list.getSnapshot().byId[id] !== undefined ? id : undefined
  const host: HostPorts = {
    openSession: (id) => { try { ctx.uiWorkspace.openSession(id) } catch (e) { console.warn('[dsh-conversation-split] openSession', e) } },
    mainSession: () => knownSession(ctx.sidebarRight.mounted.getSnapshot()),
    async createSession(near) {
      const workspaceId = near === undefined ? undefined : workspaces?.list.getSnapshot().items.find((w) => w.sessionIds.includes(near))?.workspaceId
      if (workspaceId !== undefined) return await ctx.sessions.create({ workspaceId })
      const cwd = near === undefined ? undefined : ctx.sessions.list.getSnapshot().byId[near]?.cwd
      return await ctx.sessions.create(cwd === undefined ? {} : { cwd })
    },
    notify: (kind) => toast.show(kind === 'paneLimit' ? t('toast.paneLimit', { max: MAX_PANES }) : t('toast.createFailed')),
    readStorage: () => { try { return localStorage.getItem('dsh-conversation-split.layout.v1') } catch { return null } },
    writeStorage: (v) => { try { v === null ? localStorage.removeItem('dsh-conversation-split.layout.v1') : localStorage.setItem('dsh-conversation-split.layout.v1', v) } catch { /* in-memory only */ } },
  }
  const controller = createSplitController(host)

  const enterSplit = (): void => {
    if (shadow !== null) return
    shadow = ctx.effect(
      () => ctx.slots.inject('main.conversation', () =>
        ctx.slots.register({ name: 'main.conversation', priority: -1, inject: () => ({ anchor }) }, SplitAnchor as never)),
      `${PKG}: placeholder`,
    )
  }
  const leaveSplit = (): void => {
    const current = shadow
    shadow = null
    if (current !== null) dispose(current)
  }
  const syncShadow = (): void => { controller.getSnapshot() === null ? leaveSplit() : enterSplit() }
  ctx.effect(() => { const off = controller.subscribe(syncShadow); syncShadow(); return () => { off(); leaveSplit() } }, `${PKG}: shadow`)

  ctx.effect(() => ctx.slots.inject(PANE_SLOT, () => ctx.slots.register({ name: PANE_SLOT }, PaneBody as never)), `${PKG}: pane slot`)
  ctx.effect(
    () => ctx.slots.inject('shell.overlay', () =>
      ctx.slots.register({ name: 'shell.overlay', id: `${PKG}.overlay`, children: { [PANE_SLOT]: { kind: 'single', scope: 'session' } }, inject: () => ({ controller, anchor, sessions: ctx.sessions, toast, t, toggleSidebar: () => ctx.sidebarRight.toggleExpanded() }) }, SplitOverlay as never)),
    `${PKG}: overlay`,
  )
  ctx.effect(
    () => ctx.slots.inject('conversation.session.header.utilities', () =>
      ctx.slots.register({ name: 'conversation.session.header.utilities', id: `${PKG}.split`, order: 900, inject: () => ({ controller, t }) }, SplitButton as never)),
    `${PKG}: header button`,
  )
  ctx.effect(
    () => ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
      ctx.slots.register({ name: 'sidebar.workspaces.session.menu.item', id: `${PKG}.open-in-split`, order: 500, inject: () => ({ openInSplit: controller.openInSplit, t }) }, SessionMenuItem as never)),
    `${PKG}: session menu item`,
  )

  // Sessions that vanish (archived / deleted) leave their pane empty instead of dangling.
  const reconcile = (): void => controller.reconcile(new Set(ctx.sessions.list.getSnapshot().ids))
  ctx.effect(() => { const off = ctx.sessions.list.subscribe(reconcile); reconcile(); return off }, `${PKG}: reconcile`)

  // Picking a conversation in the sidebar while split loads it into the focused pane.
  ctx.effect(() => ctx.sidebarRight.mounted.subscribe(() => {
    const state = controller.getSnapshot()
    const mounted = knownSession(ctx.sidebarRight.mounted.getSnapshot())
    if (state === null || mounted === undefined) return
    if (leaves(state.root).some((l) => l.sessionId === mounted)) return
    controller.assign(state.focus, mounted)
  }), `${PKG}: follow sidebar`)

  ctx.inject(['workspaces'], (child) => { workspaces = child.workspaces })
  let shortcutsBound = false
  ctx.inject(['shortcuts'], (child) => {
    shortcutsBound = true
    child.effect(() => registerShortcuts(child.shortcuts, controller, t), `${PKG}: shortcuts`)
  })
  ctx.effect(() => {
    let off: (() => void) | undefined
    const timer = setTimeout(() => { if (!shortcutsBound) off = registerShortcuts(undefined, controller, t) }, 3000)
    return () => { clearTimeout(timer); off?.() }
  }, `${PKG}: shortcut fallback`)
}
