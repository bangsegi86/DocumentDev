import documentCss from '../styles/document.css?raw'
import { HIGHLIGHT_CSS } from './highlightCss'
import { PAYLOAD_ELEMENT_ID } from '@shared/constants'

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface TemplateParts {
  title: string
  lang: string
  themeCss: string
  tocHtml: string
  bodyHtml: string
  payloadJson: string
}

/**
 * Assemble the final, self-contained 3-pane documentation HTML.
 * All CSS (layout + theme variables + syntax highlighting) is inlined, and the
 * editable JSON payload is embedded in an inert <script> block for re-opening.
 */
export function renderDocumentHtml(parts: TemplateParts): string {
  const title = escapeHtml(parts.title || 'Document')
  return `<!doctype html>
<html lang="${escapeHtml(parts.lang)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content="DocumentDev" />
<title>${title}</title>
<style>
html, body { margin: 0; padding: 0; height: 100%; }
${documentCss}
${HIGHLIGHT_CSS}
${parts.themeCss}
</style>
</head>
<body>
<div class="doc-root">
  <header class="doc-topbar">${title}</header>
  <div class="doc-layout">
    <nav class="doc-sidebar">
${parts.tocHtml}
    </nav>
    <main class="doc-content">
${parts.bodyHtml}
    </main>
  </div>
</div>
<script id="${PAYLOAD_ELEMENT_ID}" type="application/json">${parts.payloadJson}</script>
</body>
</html>
`
}
