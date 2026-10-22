// Minimal typings for the DSH 0.2.x browser client surface this plugin touches. The shipped
// packages publish richer types, but depending on them would pin the plugin to one release.
import type { ReactNode } from 'react'

export type Disposer = () => unknown
export type SessionId = string

export interface SnapshotStore<T> {
  getSnapshot(): T
  subscribe(listener: () => void): Disposer
}

export interface SessionSummary {
  readonly sessionId: SessionId
  readonly title?: string
  readonly cwd?: string
  readonly blank?: boolean
  readonly archived?: boolean
  readonly updatedAt?: number
}

export interface SessionListState {
  readonly ids: readonly SessionId[]
  readonly byId: Readonly<Record<SessionId, SessionSummary | undefined>>
}

export interface SessionStatus {
  readonly running?: boolean
  readonly pendingInteraction?: unknown
}

export interface SessionReference {
  readonly sessionId: SessionId
  release(): void
}

export interface ClientSessions {
  readonly list: SnapshotStore<SessionListState>
  retain(target: SessionId, options: { readonly source: string; readonly signal?: AbortSignal }): SessionReference | undefined
  create(opts?: { readonly cwd?: string; readonly workspaceId?: string }): Promise<SessionId> | SessionId
}

export interface WorkspaceItem {
  readonly workspaceId: string
  readonly sessionIds: readonly SessionId[]
}

export interface ClientWorkspaces {
  readonly list: SnapshotStore<{ readonly items: readonly WorkspaceItem[] }>
}

export interface ClientUiWorkspace {
  openSession(sessionId: SessionId): unknown
}

export interface ClientSidebarRight {
  /** The Session the host's main conversation column currently shows. */
  readonly mounted: SnapshotStore<SessionId | undefined>
  /** Collapse or expand the right-hand sidebar column. */
  toggleExpanded(): void
}

export type ShortcutModifier = 'primary' | 'control' | 'alt' | 'shift' | 'meta'

export interface ShortcutBinding {
  readonly code: string
  readonly chord?: string
  readonly modifiers: readonly ShortcutModifier[]
}

export type ShortcutResolution =
  | { readonly status: 'handled'; run(): void }
  | { readonly status: 'blocked'; readonly reason: string }
  | { readonly status: 'pass' }

export interface ShortcutCommand {
  readonly id: string
  readonly label: () => string
  readonly aliases: readonly string[]
  readonly defaults: Readonly<Partial<Record<string, ShortcutBinding>>>
  readonly regions: readonly string[]
  readonly modals: readonly string[]
  resolve(context: { readonly region: string; readonly modal: string | null; readonly target: Element | null }): ShortcutResolution
}

export interface ClientShortcuts {
  readonly runtime: string
  readonly platform: string
  register(command: ShortcutCommand): Disposer
}

export interface ClientLocale {
  register(ns: string, dictionaries: { zh: Record<string, string>; en: Record<string, string> }): Disposer
  bind(ns: string): (key: string, params?: Record<string, string | number>) => string
}

export interface SlotRegistration {
  readonly name: string
  readonly priority?: number
  readonly order?: number
  readonly id?: string
  readonly inject?: () => Record<string, unknown>
  /** Child slots this entry renders via `renderSlot`; a session-scoped child also grants `SessionProvider`. */
  readonly children?: Record<string, { readonly kind: 'single' | 'list'; readonly scope: 'root' | 'session' }>
}

export interface ClientSlots {
  inject(owner: string, register: () => Disposer | undefined): Disposer
  register(options: SlotRegistration, component: (props: never) => ReactNode): Disposer
}

export interface ClientContext {
  effect(execute: () => Disposer | undefined | void, label?: string): Disposer
  inject(services: readonly string[], apply: (ctx: ClientContext) => void): void
  readonly slots: ClientSlots
  readonly locale: ClientLocale
  readonly sessions: ClientSessions
  readonly uiWorkspace: ClientUiWorkspace
  readonly sidebarRight: ClientSidebarRight
  readonly shortcuts: ClientShortcuts
  readonly workspaces: ClientWorkspaces
}

/** Props every root-scoped slot entry receives from the renderer. */
export interface RootSlotProps {
  readonly useSessions: <S>(selector: (state: SessionListState) => S) => S
  readonly useSessionStatus: <S>(selector: (status: ReadonlyMap<SessionId, SessionStatus>) => S) => S
  readonly renderSlot: (name: string, owner: Record<string, unknown>) => ReactNode
  readonly renderFactorySlot: (
    name: string,
    props: Record<string, unknown>,
    options?: { readonly slots?: Record<string, (props: never) => ReactNode> },
  ) => ReactNode
  readonly SessionProvider: (props: { readonly session: SessionReference; readonly children?: ReactNode }) => ReactNode
  readonly t: (key: string, params?: Record<string, string | number>) => string
}

export interface SessionSnapshot {
  readonly sessionId: SessionId
  readonly blank: boolean
  readonly awaitingFirstTurn: boolean
  readonly running: boolean
}

export interface ConversationSnapshot {
  readonly activeTargets: { readonly size: number }
}

/** Props of a session-scoped slot entry (rendered under a SessionProvider). */
export interface SessionSlotProps extends RootSlotProps {
  readonly sessionId: SessionId
  readonly useSession: <S>(selector: (snapshot: SessionSnapshot) => S) => S
  readonly useConversation: <S>(selector: (snapshot: ConversationSnapshot) => S) => S
}
