import type { JSONContent } from '@tiptap/core'
import { slugify } from '../lib/slugify'

export interface TocItem {
  id: string
  level: number
  text: string
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
