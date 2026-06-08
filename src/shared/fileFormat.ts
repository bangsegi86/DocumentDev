import { PAYLOAD_ELEMENT_ID } from './constants'
import type { DocFile } from './types'

/**
 * Extract the embedded DocFile JSON payload from an exported .html string.
 * Returns null if the file has no DocumentDev payload (e.g. a plain HTML file).
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
    if (parsed && parsed.version === 1 && parsed.tiptapDoc) return parsed
    return null
  } catch {
    return null
  }
}

/** Encode the payload so its contents can never prematurely close the host <script> tag. */
export function encodePayload(doc: DocFile): string {
  // JSON cannot contain a raw "</script>"; escaping "<" defensively keeps it inert.
  return JSON.stringify(doc).replace(/</g, '\\u003c')
}

function decodePayload(raw: string): string {
  return raw.replace(/\\u003c/g, '<')
}
