import type { JSONContent } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { slugify } from '../lib/slugify'

export interface TocItem {
  id: string
  level: number
  text: string
}

/**
 * Collect headings directly from a live ProseMirror document (no full JSON
 * serialization). Used by the editor's live TOC to keep per-keystroke cost low.
 * Equivalent output to deriveToc() (which works on exported JSON).
 */
export function deriveTocFromDoc(doc: PMNode): TocItem[] {
  const items: TocItem[] = []
  const seen = new Map<string, number>()
  doc.descendants((node) => {
    if (node.type.name !== 'heading') return
    const text = node.textContent
    let id = (node.attrs?.id as string | undefined) ?? ''
    if (!id) {
      const base = slugify(text)
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      id = count === 0 ? base : `${base}-${count + 1}`
    }
    items.push({ id, level: (node.attrs?.level as number) ?? 1, text })
  })
  return items
}

/** Shallow equality for two TOC lists (id/level/text). */
export function tocEquals(a: TocItem[], b: TocItem[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].level !== b[i].level || a[i].text !== b[i].text) return false
  }
  return true
}

/**
 * Walk a TipTap JSON document and collect its headings (H1/H2/H3) in order.
 * Ids are read from the heading node attrs (assigned live by HeadingWithId);
 * a slug fallback keeps export working even if an id is somehow missing.
 */
export function deriveToc(doc: JSONContent | null | undefined): TocItem[] {
  const items: TocItem[] = []
  if (!doc) return items
  const seen = new Map<string, number>()

  const visit = (node: JSONContent): void => {
    if (node.type === 'heading') {
      const text = collectText(node)
      let id = (node.attrs?.id as string | undefined) ?? ''
      if (!id) {
        const base = slugify(text)
        const count = seen.get(base) ?? 0
        seen.set(base, count + 1)
        id = count === 0 ? base : `${base}-${count + 1}`
      }
      items.push({ id, level: node.attrs?.level ?? 1, text })
    }
    node.content?.forEach(visit)
  }

  doc.content?.forEach(visit)
  return items
}

function collectText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? ''
  if (!node.content) return ''
  return node.content.map(collectText).join('')
}
