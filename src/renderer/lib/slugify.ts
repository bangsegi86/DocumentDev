// Heading ids are re-derived on every edit; memoize so unchanged headings cost
// a map lookup instead of four regex passes. Bounded to avoid unbounded growth.
const cache = new Map<string, string>()

/**
 * Turn heading text into a URL-fragment-friendly anchor id.
 * Keeps unicode letters/numbers (so Korean headings get readable anchors),
 * collapses whitespace to single hyphens, and lowercases ASCII.
 */
export function slugify(text: string): string {
  const hit = cache.get(text)
  if (hit !== undefined) return hit
  if (cache.size > 2000) cache.clear()
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    // drop characters that are not letters, numbers, hyphen or underscore
    .replace(/[^\p{L}\p{N}\-_]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const slug = base || 'section'
  cache.set(text, slug)
  return slug
}
