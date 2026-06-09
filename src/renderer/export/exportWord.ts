import { generateHTML } from '@tiptap/html'
import type { DocFile } from '@shared/types'
import { buildExtensions } from '../editor/extensions'
import { highlightCodeBlocks } from '../lib/highlighter'
import { inlineColors } from './inlineColors'
import { HIGHLIGHT_CSS } from './highlightCss'
import { escapeHtml } from './template'

/**
 * Build a Word-compatible document (.doc). Uses the classic "Word HTML" format:
 * an HTML file with the MS Office namespaces that Word/Google Docs open as a
 * native document. The content is laid out linearly (no flex sidebar, which
 * Word can't render); headings keep the document structured/navigable.
 */
export function exportWord(docFile: DocFile): string {
  const body = inlineColors(
    highlightCodeBlocks(generateHTML(docFile.tiptapDoc, buildExtensions({ forExport: true })))
  )
  const title = escapeHtml(docFile.title || docFile.theme.titleText)
  const theme = docFile.theme

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
body { font-family: ${theme.bodyFont}; font-size: ${theme.bodyFontSize}; color: ${theme.bodyTextColor}; }
h1, h2, h3 { color: ${theme.headingColor}; font-family: ${theme.bodyFont}; }
h1 { font-size: 22pt; border-bottom: 1px solid ${theme.tableBorderColor}; padding-bottom: 4px; }
h2 { font-size: 16pt; }
h3 { font-size: 13pt; }
a { color: ${theme.linkColor}; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid ${theme.tableBorderColor}; padding: 5px 9px; vertical-align: top; }
th { background: ${theme.tableHeaderBackground}; }
pre { background: ${theme.codeBlockBackground}; border: 1px solid ${theme.tableBorderColor}; padding: 10px; font-family: Consolas, monospace; font-size: 10pt; white-space: pre-wrap; }
code { font-family: Consolas, monospace; }
blockquote { border-left: 3px solid ${theme.tableBorderColor}; margin-left: 0; padding-left: 12px; color: #555; }
${HIGHLIGHT_CSS}
</style>
</head>
<body>
<h1>${title}</h1>
${body}
</body>
</html>
`
}
