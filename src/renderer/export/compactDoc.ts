import { getSchema, type JSONContent } from '@tiptap/core'
import { buildExtensions } from '../editor/extensions'

/** Per node/mark type: attribute name -> schema default value. */
let defaultsCache: Map<string, Record<string, unknown>> | null = null

function attrDefaults(): Map<string, Record<string, unknown>> {
  if (defaultsCache) return defaultsCache
  const schema = getSchema(buildExtensions({ forExport: true }))
  const map = new Map<string, Record<string, unknown>>()
  const collect = (name: string, attrs: Record<string, { default?: unknown }> | undefined): void => {
    const d: Record<string, unknown> = {}
    for (const [k, spec] of Object.entries(attrs ?? {})) {
      // Attributes without a default are required — never dropped.
      if (spec && 'default' in spec) d[k] = spec.default
    }
    map.set(name, d)
  }
  for (const [name, type] of Object.entries(schema.nodes)) collect(name, type.spec.attrs)
  for (const [name, type] of Object.entries(schema.marks)) collect(name, type.spec.attrs)
  defaultsCache = map
  return map
}

const same = (a: unknown, b: unknown): boolean =>
  a === b || (a !== null && typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b))

function compactAttrs(
  type: string | undefined,
  attrs: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!attrs) return undefined
  const defaults = (type && attrDefaults().get(type)) || {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(attrs)) {
    if (k in defaults && same(v, defaults[k])) continue
    out[k] = v
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * Drop attributes that equal their schema default (e.g. the
 * `"colspan":1,"rowspan":1,"colwidth":null,"backgroundColor":null` repeated on
 * every table cell). Loading fills defaults back in, so the document is
 * unchanged — and older app versions read it the same way. Roughly halves the
 * embedded payload of table-heavy documents.
 */
export function compactDoc(node: JSONContent): JSONContent {
  const out: JSONContent = { ...node }
  const attrs = compactAttrs(node.type, node.attrs)
  if (attrs) out.attrs = attrs
  else delete out.attrs
  if (node.marks) {
    out.marks = node.marks.map((m) => {
      const ma = compactAttrs(m.type, m.attrs)
      const mo = { ...m }
      if (ma) mo.attrs = ma
      else delete mo.attrs
      return mo
    })
  }
  if (node.content) out.content = node.content.map(compactDoc)
  return out
}
