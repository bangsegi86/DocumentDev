/** Widest image (px) kept as is in the body — wider than any reading pane. */
export const MAX_IMAGE_WIDTH = 1920
/** The top-bar logo is shown ~32px tall; 256px is plenty even on HiDPI. */
export const MAX_LOGO_WIDTH = 256

/**
 * Shrink a base64 PNG/JPEG/WebP data URI to at most `maxWidth` pixels wide
 * (keeping the aspect ratio). Images are embedded in the document file, so a
 * 4K screenshot would otherwise add many megabytes. GIF (animation) and SVG
 * (vector) are never touched, and the original is kept whenever resizing would
 * not make it smaller.
 */
export async function downscaleDataUri(src: string, maxWidth = MAX_IMAGE_WIDTH): Promise<string> {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,/i.exec(src)
  if (!m) return src
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    if (img.naturalWidth <= maxWidth) return src
    const width = maxWidth
    const height = Math.max(1, Math.round((img.naturalHeight * maxWidth) / img.naturalWidth))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return src
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, width, height)
    const out = canvas.toDataURL(m[1].toLowerCase(), 0.9)
    return out.length < src.length ? out : src
  } catch {
    return src
  }
}
