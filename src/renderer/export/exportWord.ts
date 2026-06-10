import { generateHTML } from '@tiptap/html'
import type { DocFile } from '@shared/types'
import { buildExtensions } from '../editor/extensions'
import { highlightCodeBlocks } from '../lib/highlighter'
import { inlineColors } from './inlineColors'
import { HIGHLIGHT_CSS } from './highlightCss'
import { escapeHtml } from './template'

/**
 * Give every table colgroup equal percentage column widths summing to 100%.
 * Combined with `table-layout: fixed; width: 100%` this forces Word to fit the
 * table to the page width (instead of auto-sizing to content and overflowing).
 */
function fitTableColumns(html: string): string {
  return html.replace(/<colgroup>([\s\S]*?)<\/colgroup>/g, (_m, inner) => {
    const n = (inner.match(/<col\b/g) || []).length || 1
    const pct = (100 / n).toFixed(4)
    const cols = Array.from({ length: n }, () => `<col style="width:${pct}%" />`).join('')
    return `<colgroup>${cols}</colgroup>`
  })
}

/**
 * Build a Word-compatible document (.doc) using the classic "Word HTML" format.
 * Orientation/margins are set via the MS Office `@page Section1` mechanism
 * (which Word actually honors), and tables are fit to the page width with
 * equal columns derived from each table's actual column count (any number).
 */
/** Word ignores data-align + margin:auto, but honors the legacy `align` attr on
 *  a block wrapper, so wrap center/right-aligned images in <p align="...">. */
function wordAlignImages(html: string): string {
  return html.replace(
    /<img\b[^>]*\bdata-align="(center|right)"[^>]*>/g,
    (m, a) => `<p align="${a}">${m}</p>`
  )
}

export function exportWord(docFile: DocFile): string {
  const body = wordAlignImages(
    fitTableColumns(
      inlineColors(highlightCodeBlocks(generateHTML(docFile.tiptapDoc, buildExtensions({ forExport: true }))))
    )
  )
  const title = escapeHtml(docFile.title || docFile.theme.titleText)
  const theme = docFile.theme

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>
/* A4 portrait with narrow margins — honored by Word via mso-page-orientation. */
@page Section1 {
  size: 595.3pt 841.9pt;
  mso-page-orientation: portrait;
  margin: 1.0cm 1.0cm 1.0cm 1.0cm;
}
div.Section1 { page: Section1; }
body { font-family: ${theme.bodyFont}; font-size: ${theme.bodyFontSize}; color: ${theme.bodyTextColor}; }
h1, h2, h3 { font-family: ${theme.bodyFont}; }
h1 { color: ${theme.h1Color}; font-weight: ${theme.h1Bold ? '700' : '400'}; font-style: ${theme.h1Italic ? 'italic' : 'normal'}; font-size: 22pt; border-bottom: 1px solid ${theme.tableBorderColor}; padding-bottom: 4px; }
h2 { color: ${theme.h2Color}; font-weight: ${theme.h2Bold ? '700' : '400'}; font-style: ${theme.h2Italic ? 'italic' : 'normal'}; font-size: 16pt; }
h3 { color: ${theme.h3Color}; font-weight: ${theme.h3Bold ? '700' : '400'}; font-style: ${theme.h3Italic ? 'italic' : 'normal'}; font-size: 13pt; }
a { color: ${theme.linkColor}; }
table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 10pt; }
th, td { border: 1px solid ${theme.tableBorderColor}; padding: 4px 7px; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
th { background: ${theme.tableHeaderBackground}; }
pre { background: ${theme.codeBlockBackground}; border: 1px solid ${theme.tableBorderColor}; padding: 10px; font-family: Consolas, monospace; font-size: 10pt; white-space: pre-wrap; }
code { font-family: Consolas, monospace; }
img { max-width: 100%; height: auto; }
blockquote { border-left: 3px solid ${theme.tableBorderColor}; margin-left: 0; padding-left: 12px; color: #555; }
${HIGHLIGHT_CSS}
</style>
</head>
<body>
<div class="Section1">
<h1>${title}</h1>
${body}
</div>
</body>
</html>
`
}
