import Heading from '@tiptap/extension-heading'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'
import { slugify } from '../../lib/slugify'

const idPluginKey = new PluginKey('headingId')

/**
 * Heading extension that renders an `id` attribute (`<h1 id="slug">`) so the
 * exported document's left navigation can link to it, and the live TOC can
 * scroll to it. Ids are kept stable across edits by a ProseMirror plugin that
 * re-derives slugs and de-duplicates collisions on every document change.
 */
export const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id'),
        renderHTML: (attributes) => (attributes.id ? { id: attributes.id } : {})
      }
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: idPluginKey,
        appendTransaction: (_transactions, oldState, newState) => {
          if (oldState.doc.eq(newState.doc)) return null
          // Don't dispatch while an IME composition is in progress — modifying
          // heading nodes mid-composition breaks Korean/CJK input (doubled jamo).
          if (editor?.view?.composing) return null

          const seen = new Map<string, number>()
          const updates: { pos: number; node: PMNode; id: string }[] = []

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'heading') return
            const base = slugify(node.textContent)
            const count = seen.get(base) ?? 0
            seen.set(base, count + 1)
            const id = count === 0 ? base : `${base}-${count + 1}`
            if (node.attrs.id !== id) updates.push({ pos, node, id })
          })

          if (updates.length === 0) return null

          const tr = newState.tr
          for (const { pos, node, id } of updates) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, id })
          }
          tr.setMeta('addToHistory', false)
          return tr
        }
      })
    ]
  }
})
