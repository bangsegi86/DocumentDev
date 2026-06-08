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
    '--doc-link': theme.linkColor,
    '--doc-table-border': theme.tableBorderColor,
    '--doc-table-header-bg': theme.tableHeaderBackground,
    '--doc-code-bg': theme.codeBlockBackground,
    '--doc-body-fg': theme.bodyTextColor,
    '--doc-font': theme.bodyFont,
    '--doc-font-size': theme.bodyFontSize
  } as CSSProperties
}

/**
 * Convert theme settings into a `:root { --var: value }` block. The same set of
 * CSS variables is consumed by `document.css` in both the live editor preview
 * and the exported HTML, so theme changes are instantly WYSIWYG.
 *
 * @param selector CSS selector to scope the variables to (default `:root`).
 */
export function themeToCss(theme: ThemeSettings, selector = ':root'): string {
  return `${selector} {
  --doc-topbar-bg: ${theme.topBarColor};
  --doc-topbar-fg: ${theme.topBarTextColor};
  --doc-sidebar-bg: ${theme.sidebarColor};
  --doc-sidebar-fg: ${theme.sidebarTextColor};
  --doc-heading: ${theme.headingColor};
  --doc-link: ${theme.linkColor};
  --doc-table-border: ${theme.tableBorderColor};
  --doc-table-header-bg: ${theme.tableHeaderBackground};
  --doc-code-bg: ${theme.codeBlockBackground};
  --doc-body-fg: ${theme.bodyTextColor};
  --doc-font: ${theme.bodyFont};
  --doc-font-size: ${theme.bodyFontSize};
}`
}
