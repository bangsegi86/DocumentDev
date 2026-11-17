import { generateHTML } from '@tiptap/html'
import type { JSONContent } from '@tiptap/core'
import type { DocFile } from '@shared/types'
import { buildExtensions } from '../editor/extensions'
import { themeToCss } from '../theme/themeToCss'
import { deriveToc } from '../toc/toc'
import { highlightCodeBlocks } from '../lib/highlighter'
import { inlineColors } from './inlineColors'
import { encodePayload, packImages, collectDataImages } from '@shared/fileFormat'
import { compactDoc } from './compactDoc'
import { renderDocumentHtml, escapeHtml } from './template'

/** Build the nested <ul> sidebar markup from the document's headings. */
function buildTocHtml(doc: JSONContent): string {
  const items = deriveToc(doc)
  if (items.length === 0) return '      <ul></ul>'
  const lis = items
    .map(
      (item) =>
        `        <li><a class="toc-h${item.level}" href="#${escapeHtml(item.id)}">${escapeHtml(
          item.text
        )}</a></li>`
    )
    .join('\n')
  return `      <ul>\n${lis}\n      </ul>`
}

/**
 * Serialize the current document into the final self-contained .html string.
 * This file is BOTH the shareable document and the re-editable project file.
 */
export function exportHtml(docFile: DocFile): string {
  const doc = docFile.tiptapDoc
  // Same extension list as the editor so headings, code highlighting and tables
  // serialize identically (round-trip safety).
  const bodyHtml = inlineColors(
    highlightCodeBlocks(generateHTML(doc, buildExtensions({ forExport: true })))
  )
  const tocHtml = buildTocHtml(doc)
  const themeCss = themeToCss(docFile.theme, '.doc-root')

  // Assemble the visible document first (with a placeholder where the payload
  // goes), so the payload can reference images that page already contains.
  const shell = renderDocumentHtml({
    title: docFile.title || docFile.theme.titleText,
    lang: docFile.lang,
    logoDataUrl: docFile.theme.logoDataUrl || '',
    themeCss,
    tocHtml,
    bodyHtml,
    payloadJson: PAYLOAD_PLACEHOLDER
  })
  const at = shell.lastIndexOf(PAYLOAD_PLACEHOLDER)
  const compact: DocFile = { ...docFile, tiptapDoc: compactDoc(doc) }
  const payload = packImages(compact, collectDataImages(shell.slice(0, at)))
  return shell.slice(0, at) + encodePayload(payload) + shell.slice(at + PAYLOAD_PLACEHOLDER.length)
}

/** Stand-in for the payload while the page is assembled (spliced by index, so
 *  the same text typed in the document body can't be confused with it). */
const PAYLOAD_PLACEHOLDER = '\u0000DOCDEV_PAYLOAD\u0000'
