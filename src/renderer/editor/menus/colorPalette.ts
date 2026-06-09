/** Shared colour data + helpers for the PowerPoint-style colour palette. */

// Office default theme base colours (top row of the "Theme Colors" block).
export const THEME_COLORS = [
  '#FFFFFF',
  '#000000',
  '#E7E6E6',
  '#44546A',
  '#4472C4',
  '#ED7D31',
  '#A5A5A5',
  '#FFC000',
  '#5B9BD5',
  '#70AD47'
]

// Tint/shade steps applied to each theme colour column (toward white / black).
export const THEME_VARIATION_STEPS = [0.8, 0.6, 0.4, -0.25, -0.5]

// The "Standard Colors" row.
export const STANDARD_COLORS = [
  '#C00000',
  '#FF0000',
  '#FFC000',
  '#FFFF00',
  '#92D050',
  '#00B050',
  '#00B0F0',
  '#0070C0',
  '#002060',
  '#7030A0'
]

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  }
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
}

/** Blend a colour toward white (t>0) or black (t<0); |t| is the amount 0..1. */
export function shade(hex: string, t: number): string {
  const { r, g, b } = hexToRgb(hex)
  const target = t >= 0 ? 255 : 0
  const amt = Math.abs(t)
  const mix = (c: number): number => c + (target - c) * amt
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}

const RECENT_KEY = 'docdev.recentColors'

export function loadRecentColors(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(v) ? v.slice(0, 10) : []
  } catch {
    return []
  }
}

export function pushRecentColor(color: string): void {
  const cur = loadRecentColors().filter((c) => c.toLowerCase() !== color.toLowerCase())
  const next = [color, ...cur].slice(0, 10)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / unavailable storage */
  }
}
