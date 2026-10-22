export interface ToastStore {
  getSnapshot(): string | null
  subscribe(listener: () => void): () => void
  show(text: string, ms?: number): void
}

export function createToastStore(): ToastStore {
  let text: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()
  const emit = (): void => { for (const l of listeners) l() }
  return {
    getSnapshot: () => text,
    subscribe(l) { listeners.add(l); return () => listeners.delete(l) },
    show(next, ms = 2600) {
      if (timer) clearTimeout(timer)
      text = next
      emit()
      timer = setTimeout(() => { text = null; emit() }, ms)
    },
  }
}
