/**
 * @tiptap/html strips inline `style` attributes during serialization, so text
 * color and table-cell background are carried as `data-color` /
 * `data-background-color` attributes. This restores them as inline styles in the
 * exported HTML/Word so colors are visible without any runtime JS.
 */
export function inlineColors(html: string): string {
  return html
    .replace(/data-color="([^"]+)"/g, (m, c) => `${m} style="color: ${c}"`)
    .replace(/data-background-color="([^"]+)"/g, (m, c) => `${m} style="background-color: ${c}"`)
}
