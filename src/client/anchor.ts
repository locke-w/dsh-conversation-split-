import { createElement, useCallback, type ReactNode } from 'react'

export interface AnchorStore {
  get(): HTMLElement | null
  set(element: HTMLElement | null): void
  subscribe(listener: () => void): () => void
}

export function createAnchorStore(): AnchorStore {
  let element: HTMLElement | null = null
  const listeners = new Set<() => void>()
  return {
    get: () => element,
    set(next) {
      if (next === element) return
      element = next
      for (const l of listeners) l()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** Placeholder rendered in `main.conversation` while a split is open; the overlay covers its box. */
export function SplitAnchor({ anchor }: { readonly anchor: AnchorStore }): ReactNode {
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (element !== null) anchor.set(element)
      else if (anchor.get()?.isConnected !== true) anchor.set(null)
    },
    [anchor],
  )
  return createElement('div', { ref, className: 'dcs-anchor', 'data-split-anchor': '' })
}
