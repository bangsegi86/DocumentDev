import { PAYLOAD_ELEMENT_ID } from './constants'
import type { DocFile } from './types'

/**
 * Extract the embedded DocFile JSON payload from an exported .html string.
 * Returns null if the file has no DocumentDev payload (e.g. a plain HTML file).
 * Version-2 payloads reference images already present in the visible HTML
 * (see packImages); they are resolved back to full data URIs here.
 */
export function extractPayload(html: string): DocFile | null {
  // Match: <script id="docdev-data" type="application/json"> ... </script>
  const re = new RegExp(
    `<script[^>]*id=["']${PAYLOAD_ELEMENT_ID}["'][^>]*>([\\s\\S]*?)<\\/script>`,
    'i'
  )
  const match = html.match(re)
  if (!match) return null
  try {
    const json = decodePayload(match[1].trim())
    const parsed = JSON.parse(json) as DocFile
    if (!parsed || !parsed.tiptapDoc) return null
    if (parsed.version === 1) return parsed
    if (parsed.version === 2) {
      return unpackImages(parsed, collectDataImages(html.slice(0, match.index)))
    }
    return null
  } catch {
    return null
  }
}

// ---- Image de-duplication -------------------------------------------------
// Embedded images are base64 data URIs. They already appear in the visible
// HTML (<img src="data:...">), so instead of storing each one a second time in
// the JSON payload, the payload refers to them as "docdev-img:<n>", where n is
// the index of that URI among the DISTINCT base64 image URIs of the HTML that
// precedes the payload, in document order.

const IMG_REF_PREFIX = 'docdev-img:'
const DATA_IMG_RE = /\bsrc="(data:[a-z0-9.+/-]+;base64,[A-Za-z0-9+/=]+)"/gi

/** Distinct base64 image data URIs in `html`, in order of first appearance. */
export function collectDataImages(html: string): string[] {
  const seen = new Set<string>()
  for (const m of html.matchAll(DATA_IMG_RE)) seen.add(m[1])
  return [...seen]
}

type JsonNode = { type?: string; attrs?: Record<string, unknown>; content?: JsonNode[] }

function mapImageSrcs(node: JsonNode, fn: (src: string) => string): JsonNode {
  const out: JsonNode = { ...node }
  if (node.type === 'image' && typeof node.attrs?.src === 'string') {
    out.attrs = { ...node.attrs, src: fn(node.attrs.src) }
  }
  if (node.content) out.content = node.content.map((c) => mapImageSrcs(c, fn))
  return out
}

/** Replace image data URIs (doc + logo) that occur in `images` by references.
 *  Returns a version-2 file if anything was replaced, else the file as is. */
export function packImages(doc: DocFile, images: string[]): DocFile {
  if (images.length === 0) return doc
  const index = new Map(images.map((src, i) => [src, i]))
  let used = false
  const ref = (src: string): string => {
    const i = index.get(src)
    if (i === undefined) return src
    used = true
    return IMG_REF_PREFIX + i
  }
  const tiptapDoc = mapImageSrcs(doc.tiptapDoc as JsonNode, ref) as DocFile['tiptapDoc']
  const logo = doc.theme.logoDataUrl ? ref(doc.theme.logoDataUrl) : doc.theme.logoDataUrl
  if (!used) return doc
  return { ...doc, version: 2, theme: { ...doc.theme, logoDataUrl: logo }, tiptapDoc }
}

/** Inverse of packImages. Unknown references become an empty src. */
export function unpackImages(doc: DocFile, images: string[]): DocFile {
  const resolve = (src: string): string =>
    src.startsWith(IMG_REF_PREFIX) ? images[Number(src.slice(IMG_REF_PREFIX.length))] ?? '' : src
  const tiptapDoc = mapImageSrcs(doc.tiptapDoc as JsonNode, resolve) as DocFile['tiptapDoc']
  const logo = doc.theme?.logoDataUrl ? resolve(doc.theme.logoDataUrl) : doc.theme?.logoDataUrl
  return { ...doc, version: 1, theme: { ...doc.theme, logoDataUrl: logo }, tiptapDoc }
}

/** Encode the payload so its contents can never prematurely close the host <script> tag. */
export function encodePayload(doc: DocFile): string {
  // JSON cannot contain a raw "</script>"; escaping "<" defensively keeps it inert.
  return JSON.stringify(doc).replace(/</g, '\\u003c')
}

function decodePayload(raw: string): string {
  return raw.replace(/\\u003c/g, '<')
}
