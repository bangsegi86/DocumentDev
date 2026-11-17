import type { CSSProperties } from 'react'
import type { ThemeSettings } from '@shared/types'

/** Same variables as themeToCss(), but as inline style props for the live preview. */
export function themeToStyle(theme: ThemeSettings): CSSProperties {
  return {
    '--doc-topbar-bg': theme.topBarColor,
    '--doc-topbar-fg': theme.topBarTextColor,
    '--doc-sidebar-bg': theme.sidebarColor,
    '--doc-sidebar-fg': theme.sidebarTextColor,
    '--doc-heading': theme.headingColor,
    '--doc-h1-color': theme.h1Color,
    '--doc-h1-weight': theme.h1Bold ? '700' : '400',
    '--doc-h1-style': theme.h1Italic ? 'italic' : 'normal',
    '--doc-h2-color': theme.h2Color,
    '--doc-h2-weight': theme.h2Bold ? '700' : '400',
    '--doc-h2-style': theme.h2Italic ? 'italic' : 'normal',
    '--doc-h3-color': theme.h3Color,
    '--doc-h3-weight': theme.h3Bold ? '700' : '400',
    '--doc-h3-style': theme.h3Italic ? 'italic' : 'normal',
    '--doc-link': theme.linkColor,
    '--doc-table-border': theme.tableBorderColor,
    '--doc-table-header-bg': theme.tableHeaderBackground,
    '--doc-code-bg': theme.codeBlockBackground,
    '--doc-breadcrumb-bg': theme.breadcrumbColor,
    '--doc-body-fg': theme.bodyTextColor,
    '--doc-font': theme.bodyFont,
    '--doc-font-size': theme.bodyFontSize
  } as CSSProperties
}

/**
 * Theme values come from the opened file and are pasted into a <style> block
 * on export. Strip anything that could end the declaration or the style
 * element (`;` `{` `}` `<` `>` `\`) so a tampered file can't inject CSS rules
 * or a <script>. Legit colours/fonts never contain these characters.
 */
export function cssSafeTheme(theme: ThemeSettings): ThemeSettings {
  const out = { ...theme } as Record<string, unknown>
  for (const [k, v] of Object.entries(out)) {
    if (k === 'logoDataUrl' || k === 'titleText') continue // HTML-escaped where used, not CSS
    if (typeof v === 'string') out[k] = v.replace(/[;{}<>\\]/g, '')
    else if (typeof v !== 'boolean') out[k] = String(v ?? '').replace(/[;{}<>\\]/g, '')
  }
  return out as unknown as ThemeSettings
}

/**
 * Convert theme settings into a `:root { --var: value }` block. The same set of
 * CSS variables is consumed by `document.css` in both the live editor preview
 * and the exported HTML, so theme changes are instantly WYSIWYG.
 *
 * @param selector CSS selector to scope the variables to (default `:root`).
 */
export function themeToCss(rawTheme: ThemeSettings, selector = ':root'): string {
  const theme = cssSafeTheme(rawTheme)
  return `${selector} {
  --doc-topbar-bg: ${theme.topBarColor};
  --doc-topbar-fg: ${theme.topBarTextColor};
  --doc-sidebar-bg: ${theme.sidebarColor};
  --doc-sidebar-fg: ${theme.sidebarTextColor};
  --doc-heading: ${theme.headingColor};
  --doc-h1-color: ${theme.h1Color};
  --doc-h1-weight: ${theme.h1Bold ? '700' : '400'};
  --doc-h1-style: ${theme.h1Italic ? 'italic' : 'normal'};
  --doc-h2-color: ${theme.h2Color};
  --doc-h2-weight: ${theme.h2Bold ? '700' : '400'};
  --doc-h2-style: ${theme.h2Italic ? 'italic' : 'normal'};
  --doc-h3-color: ${theme.h3Color};
  --doc-h3-weight: ${theme.h3Bold ? '700' : '400'};
  --doc-h3-style: ${theme.h3Italic ? 'italic' : 'normal'};
  --doc-link: ${theme.linkColor};
  --doc-table-border: ${theme.tableBorderColor};
  --doc-table-header-bg: ${theme.tableHeaderBackground};
  --doc-code-bg: ${theme.codeBlockBackground};
  --doc-breadcrumb-bg: ${theme.breadcrumbColor};
  --doc-body-fg: ${theme.bodyTextColor};
  --doc-font: ${theme.bodyFont};
  --doc-font-size: ${theme.bodyFontSize};
}`
}
