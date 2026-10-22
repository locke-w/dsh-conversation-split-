// One pane's Session: retained in an effect under this plugin's own source label (so the host's
// `mainView` bookkeeping is untouched), published through the renderer's SessionProvider, and
// released only after the provider subtree has unmounted.
import { memo, useEffect, useState, type ReactNode } from 'react'
import type { ClientSessions, RootSlotProps, SessionReference, SessionSlotProps } from '../dsh-types.d.ts'
import type { Translate } from './locale.ts'

export const RETAIN_SOURCE = 'conversationSplit'
export const PANE_SLOT = 'dsh-conversation-split.pane'
const RETAIN_ATTEMPTS = 3
const RETAIN_RETRY_MS = 200

type Held = { kind: 'opening' } | { kind: 'failed' } | { kind: 'held'; reference: SessionReference }

export interface PaneSessionProps {
  readonly paneId: string
  readonly sessionId: string
  readonly sessions: ClientSessions
  readonly SessionProvider: RootSlotProps['SessionProvider']
  readonly renderSlot: RootSlotProps['renderSlot']
  readonly t: Translate
}

export const PaneSession = memo(function PaneSession(props: PaneSessionProps): ReactNode {
  const [attempt, setAttempt] = useState(0)
  return <RetainedPane key={attempt} {...props} onRetry={() => setAttempt((n) => n + 1)} />
})

function RetainedPane({ paneId, sessionId, sessions, SessionProvider, renderSlot, t, onRetry }: PaneSessionProps & { onRetry: () => void }): ReactNode {
  const [held, setHeld] = useState<Held>({ kind: 'opening' })

  useEffect(() => {
    const controller = new AbortController()
    let reference: SessionReference | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let tries = 0
    const acquire = (): void => {
      timer = undefined
      let result: SessionReference | undefined
      try {
        result = sessions.retain(sessionId, { source: RETAIN_SOURCE, signal: controller.signal })
      } catch (error) {
        console.error('[dsh-conversation-split] retain failed', sessionId, error)
      }
      if (result !== undefined) {
        reference = result
        setHeld({ kind: 'held', reference: result })
        return
      }
      if (++tries >= RETAIN_ATTEMPTS) {
        setHeld({ kind: 'failed' })
        return
      }
      timer = setTimeout(acquire, RETAIN_RETRY_MS)
    }
    acquire()
    return () => {
      if (timer !== undefined) clearTimeout(timer)
      controller.abort()
      const release = reference
      if (release !== undefined) setTimeout(() => release.release(), 0)
    }
  }, [sessions, sessionId])

  if (held.kind === 'opening') return <div className="dcs-note">{t('pane.opening')}</div>
  if (held.kind === 'failed') {
    return (
      <div className="dcs-note">
        <span>{t('pane.failed')}</span>
        <button type="button" onClick={onRetry}>{t('pane.retry')}</button>
      </div>
    )
  }
  return <SessionProvider session={held.reference}>{renderSlot(PANE_SLOT, { paneId })}</SessionProvider>
}

function FixedChat(props: { readonly renderSlot: RootSlotProps['renderSlot'] }): ReactNode {
  return props.renderSlot('conversation.session', { view: 'chat' })
}

/** The session-scoped pane entry: the host's own conversation, embedded, no hero workspace row. */
export function PaneBody({ sessionId, useSession, useConversation, useSessions, renderFactorySlot }: SessionSlotProps): ReactNode {
  const session = useSession((s) => s)
  const active = useConversation((c) => c.activeTargets.size > 0)
  const summaryBlank = useSessions((state) => state.byId[sessionId]?.blank)
  const started = active || (!session.blank && !session.awaitingFirstTurn) || summaryBlank === false
  const phase = started ? 'active' : 'hero'
  return (
    <div className="dcs-body" data-split-pane-body="">
      {renderFactorySlot('conversation.content', { variant: 'embedded', phase, hero: false }, { slots: { views: FixedChat } })}
    </div>
  )
}
