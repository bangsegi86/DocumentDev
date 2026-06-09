import { generateHTML } from '@tiptap/html'
import type { JSONContent } from '@tiptap/core'
import type { DocFile } from '@shared/types'
import { buildExtensions } from '../editor/extensions'
import { themeToCss } from '../theme/themeToCss'
import { deriveToc } from '../toc/toc'
import { highlightCodeBlocks } from '../lib/highlighter'
import { inlineColors } from './inlineColors'
import { encodePayload } from '@shared/fileFormat'
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
  const payloadJson = encodePayload(docFile)

  return renderDocumentHtml({
    title: docFile.title || docFile.theme.titleText,
    lang: docFile.lang,
    themeCss,
    tocHtml,
    bodyHtml,
    payloadJson
  })
}
