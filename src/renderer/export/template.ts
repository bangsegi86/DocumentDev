import documentCss from '../styles/document.css?raw'
import { HIGHLIGHT_CSS } from './highlightCss'
import { PAYLOAD_ELEMENT_ID } from '@shared/constants'

/**
 * Inline script (no external deps) that updates the breadcrumb as the reader
 * scrolls the exported document in a browser — mirroring the editor behavior.
 */
const BREADCRUMB_SCRIPT = `
(function () {
  var container = document.querySelector('.doc-content');
  var bc = document.getElementById('doc-breadcrumb');
  if (!container || !bc) return;
  var headings = [].slice.call(container.querySelectorAll('h1, h2, h3'));
  function levelOf(el) { return el.tagName === 'H1' ? 1 : el.tagName === 'H2' ? 2 : 3; }
  function update() {
    var threshold = container.getBoundingClientRect().top + 90;
    var h1 = null, h2 = null, h3 = null;
    for (var i = 0; i < headings.length; i++) {
      var el = headings[i];
      if (el.getBoundingClientRect().top <= threshold) {
        var lvl = levelOf(el);
        if (lvl === 1) { h1 = el; h2 = null; h3 = null; }
        else if (lvl === 2) { h2 = el; h3 = null; }
        else { h3 = el; }
      } else break;
    }
    var trail = [h1, h2, h3].filter(Boolean);
    bc.textContent = '';
    trail.forEach(function (el, idx) {
      if (idx > 0) {
        var sep = document.createElement('span');
        sep.className = 'crumb-sep';
        sep.textContent = '\\u203A';
        bc.appendChild(sep);
      }
      var span = document.createElement('span');
      span.className = 'crumb';
      var a = document.createElement('a');
      a.textContent = el.textContent;
      a.href = '#' + el.id;
      span.appendChild(a);
      bc.appendChild(span);
    });
  }
  container.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  // Hamburger: toggle the left contents sidebar.
  var toggle = document.getElementById('doc-sidebar-toggle');
  var root = document.querySelector('.doc-root');
  if (toggle && root) {
    toggle.addEventListener('click', function () {
      root.classList.toggle('sidebar-collapsed');
    });
  }
})();
`

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
  <header class="doc-topbar"><button class="doc-sidebar-toggle" id="doc-sidebar-toggle" type="button" aria-label="Toggle contents">&#9776;</button><span class="doc-topbar-title">${title}</span></header>
  <div class="doc-layout">
    <nav class="doc-sidebar">
${parts.tocHtml}
    </nav>
    <div class="doc-main">
      <div class="doc-breadcrumb" id="doc-breadcrumb"></div>
      <main class="doc-content">
${parts.bodyHtml}
      </main>
    </div>
  </div>
</div>
<script>${BREADCRUMB_SCRIPT}</script>
<script id="${PAYLOAD_ELEMENT_ID}" type="application/json">${parts.payloadJson}</script>
</body>
</html>
`
}
