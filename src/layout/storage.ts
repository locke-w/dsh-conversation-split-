import { isValidLayout, type Layout } from './tree.ts'

export const STORAGE_KEY = 'dsh-conversation-split.layout.v1'

export function serializeLayout(layout: Layout): string {
  return JSON.stringify(layout)
}

/** Parse a stored layout; anything malformed is dropped rather than half-restored. */
export function parseLayout(raw: string | null): Layout | null {
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    return isValidLayout(value) ? value : null
  } catch {
    return null
  }
}
