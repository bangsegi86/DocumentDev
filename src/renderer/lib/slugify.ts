/**
 * Turn heading text into a URL-fragment-friendly anchor id.
 * Keeps unicode letters/numbers (so Korean headings get readable anchors),
 * collapses whitespace to single hyphens, and lowercases ASCII.
 */
export function slugify(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    // drop characters that are not letters, numbers, hyphen or underscore
    .replace(/[^\p{L}\p{N}\-_]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'section'
}
