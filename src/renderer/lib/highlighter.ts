import hljs from 'highlight.js/lib/core'
import { LANGUAGES } from './languages'

for (const [name, fn] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, fn)
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/**
 * Statically syntax-highlight every `<pre><code class="language-x">` block in a
 * serialized HTML string by baking highlight.js spans into the markup. This lets
 * the exported file show colored code with NO runtime JS (fully offline/self-contained).
 */
export function highlightCodeBlocks(html: string): string {
  const re = /<pre>\s*<code class="language-([^"]+)">([\s\S]*?)<\/code>\s*<\/pre>/g
  return html.replace(re, (_match, lang: string, escaped: string) => {
    const code = unescapeHtml(escaped)
    let inner: string
    if (lang && lang !== 'plaintext' && hljs.getLanguage(lang)) {
      inner = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
    } else {
      // unknown / plaintext: keep the already-escaped text as-is
      inner = escaped
    }
    return `<pre><code class="hljs language-${lang}">${inner}</code></pre>`
  })
}
