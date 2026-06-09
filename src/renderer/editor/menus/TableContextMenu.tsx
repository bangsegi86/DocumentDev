import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useI18n } from '../../i18n/I18nContext'
import {
  THEME_COLORS,
  THEME_VARIATION_STEPS,
  STANDARD_COLORS,
  shade,
  loadRecentColors,
  pushRecentColor
} from './colorPalette'

interface MenuState {
  x: number
  y: number
}

const SVG = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
}

const RowAbove = (): JSX.Element => (
  <svg {...SVG}>
    <path d="M8 1v3.5M6.2 2.8 8 1l1.8 1.8" />
    <rect x="2" y="7" width="12" height="7" rx="1" />
    <path d="M2 10.5h12" />
  </svg>
)
const RowBelow = (): JSX.Element => (
  <svg {...SVG}>
    <rect x="2" y="2" width="12" height="7" rx="1" />
    <path d="M2 5.5h12" />
    <path d="M8 15v-3.5M6.2 13.2 8 15l1.8-1.8" />
  </svg>
)
const ColLeft = (): JSX.Element => (
  <svg {...SVG}>
    <path d="M1 8h3.5M2.8 6.2 1 8l1.8 1.8" />
    <rect x="7" y="2" width="7" height="12" rx="1" />
    <path d="M10.5 2v12" />
  </svg>
)
const ColRight = (): JSX.Element => (
  <svg {...SVG}>
    <rect x="2" y="2" width="7" height="12" rx="1" />
    <path d="M5.5 2v12" />
    <path d="M15 8h-3.5M13.2 6.2 15 8l-1.8 1.8" />
  </svg>
)
const DelRow = (): JSX.Element => (
  <svg {...SVG}>
    <rect x="2" y="5" width="12" height="6" rx="1" />
    <path d="m6 6 4 4M10 6l-4 4" />
  </svg>
)
const DelCol = (): JSX.Element => (
  <svg {...SVG}>
    <rect x="5" y="2" width="6" height="12" rx="1" />
    <path d="m6 6 4 4M10 6l-4 4" />
  </svg>
)
const Bucket = (): JSX.Element => (
  <svg {...SVG}>
    <path d="M3 7 8 2l5 5-5 5z" />
    <path d="M13 11c1 1.3 1.5 2.2 1.5 2.8a1.5 1.5 0 0 1-3 0c0-.6.5-1.5 1.5-2.8z" />
  </svg>
)
const NoFill = (): JSX.Element => (
  <svg {...SVG}>
    <circle cx="8" cy="8" r="6.2" />
    <path d="m3.8 3.8 8.4 8.4" />
  </svg>
)
const Caret = (): JSX.Element => (
  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
    <path d="M1 2.5 4 5.5 7 2.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** A flyout palette: Theme / Standard / Recent colours + a "none" option. */
function ColorPalette({
  noneLabel,
  noneIcon,
  onPick,
  onNone
}: {
  noneLabel: string
  noneIcon: JSX.Element
  onPick: (color: string) => void
  onNone: () => void
}): JSX.Element {
  const { t } = useI18n()
  const recents = loadRecentColors()
  const Swatch = ({ color }: { color: string }): JSX.Element => (
    <button
      type="button"
      className="ctx-swatch"
      style={{ background: color }}
      title={color}
      onClick={() => onPick(color)}
    />
  )
  return (
    <div className="ctx-palette" onMouseDown={(e) => e.stopPropagation()}>
      <div className="ctx-pal-section">{t('themeColors')}</div>
      <div className="ctx-pal-row">
        {THEME_COLORS.map((c) => (
          <Swatch key={c} color={c} />
        ))}
      </div>
      <div className="ctx-pal-variations">
        {THEME_VARIATION_STEPS.map((step) => (
          <div className="ctx-pal-row" key={step}>
            {THEME_COLORS.map((c) => {
              const v = shade(c, step)
              return <Swatch key={c + step} color={v} />
            })}
          </div>
        ))}
      </div>

      <div className="ctx-pal-section">{t('standardColors')}</div>
      <div className="ctx-pal-row">
        {STANDARD_COLORS.map((c) => (
          <Swatch key={c} color={c} />
        ))}
      </div>

      {recents.length > 0 && (
        <>
          <div className="ctx-pal-section">{t('recentColors')}</div>
          <div className="ctx-pal-row">
            {recents.map((c) => (
              <Swatch key={c} color={c} />
            ))}
          </div>
        </>
      )}

      <div className="ctx-divider" />
      <button type="button" className="ctx-action subtle" onClick={onNone}>
        <span className="ctx-ico">{noneIcon}</span>
        {noneLabel}
      </button>
    </div>
  )
}

/**
 * Right-click menu inside tables. Operates on the cell that was clicked
 * (the cursor is moved there first): row/column insert & delete, plus
 * PowerPoint-style Fill / Font-colour split buttons with a colour palette.
 */
export function TableContextMenu({ editor }: { editor: Editor }): JSX.Element | null {
  const { t } = useI18n()
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [palette, setPalette] = useState<'fill' | 'text' | null>(null)

  useEffect(() => {
    const dom = editor.view.dom
    const onContext = (e: MouseEvent): void => {
      const coords = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
      if (!coords) return
      const $pos = editor.state.doc.resolve(coords.pos)
      let inTable = false
      for (let d = $pos.depth; d > 0; d--) {
        if ($pos.node(d).type.name === 'table') {
          inTable = true
          break
        }
      }
      if (!inTable) return
      e.preventDefault()
      editor.commands.setTextSelection(coords.pos)
      setPalette(null)
      setMenu({ x: e.clientX, y: e.clientY })
    }
    dom.addEventListener('contextmenu', onContext)
    return () => dom.removeEventListener('contextmenu', onContext)
  }, [editor])

  useEffect(() => {
    if (!menu) return
    const close = (): void => {
      setMenu(null)
      setPalette(null)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menu])

  if (!menu) return null

  const run = (fn: () => void): void => {
    fn()
    setMenu(null)
    setPalette(null)
  }
  const applyFill = (color: string | null): void =>
    run(() => {
      editor.chain().focus().setCellAttribute('backgroundColor', color).run()
      if (color) pushRecentColor(color)
    })
  const applyText = (color: string | null): void =>
    run(() => {
      const chain = editor.chain().focus()
      if (color) {
        chain.setColor(color).run()
        pushRecentColor(color)
      } else {
        chain.unsetColor().run()
      }
    })

  // Current colours of the clicked cell (shown on the split buttons).
  const cellAttrs = editor.isActive('tableHeader')
    ? editor.getAttributes('tableHeader')
    : editor.getAttributes('tableCell')
  const currentFill: string = cellAttrs.backgroundColor || ''
  const currentText: string = editor.getAttributes('textStyle').color || '#000000'

  const style: React.CSSProperties = {
    left: Math.min(menu.x, Math.max(8, window.innerWidth - 252)),
    top: Math.min(menu.y, Math.max(8, window.innerHeight - 380))
  }

  return (
    <div
      className="ctx-menu"
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* PowerPoint-style colour toolbar */}
      <div className="ctx-toolbar">
        <button
          type="button"
          className={`ctx-tool ${palette === 'fill' ? 'open' : ''}`}
          onClick={() => setPalette((p) => (p === 'fill' ? null : 'fill'))}
        >
          <span className="ctx-tool-ico">
            <Bucket />
            <span
              className="ctx-tool-bar"
              style={currentFill ? { background: currentFill } : { background: 'transparent' }}
            />
          </span>
          <span className="ctx-tool-label">
            {t('fill')} <Caret />
          </span>
        </button>
        <button
          type="button"
          className={`ctx-tool ${palette === 'text' ? 'open' : ''}`}
          onClick={() => setPalette((p) => (p === 'text' ? null : 'text'))}
        >
          <span className="ctx-tool-ico">
            <span className="ctx-tool-A">A</span>
            <span className="ctx-tool-bar" style={{ background: currentText }} />
          </span>
          <span className="ctx-tool-label">
            {t('fontColor')} <Caret />
          </span>
        </button>
      </div>

      <div className="ctx-divider" />

      <button className="ctx-action" onClick={() => run(() => editor.chain().focus().addRowBefore().run())}>
        <span className="ctx-ico"><RowAbove /></span>{t('addRowBefore')}
      </button>
      <button className="ctx-action" onClick={() => run(() => editor.chain().focus().addRowAfter().run())}>
        <span className="ctx-ico"><RowBelow /></span>{t('addRowAfter')}
      </button>
      <button className="ctx-action" onClick={() => run(() => editor.chain().focus().addColumnBefore().run())}>
        <span className="ctx-ico"><ColLeft /></span>{t('addColBefore')}
      </button>
      <button className="ctx-action" onClick={() => run(() => editor.chain().focus().addColumnAfter().run())}>
        <span className="ctx-ico"><ColRight /></span>{t('addColAfter')}
      </button>

      <div className="ctx-divider" />

      <button className="ctx-action danger" onClick={() => run(() => editor.chain().focus().deleteRow().run())}>
        <span className="ctx-ico"><DelRow /></span>{t('deleteRow')}
      </button>
      <button className="ctx-action danger" onClick={() => run(() => editor.chain().focus().deleteColumn().run())}>
        <span className="ctx-ico"><DelCol /></span>{t('deleteCol')}
      </button>

      {palette === 'fill' && (
        <ColorPalette
          noneLabel={t('noFill')}
          noneIcon={<NoFill />}
          onPick={(c) => applyFill(c)}
          onNone={() => applyFill(null)}
        />
      )}
      {palette === 'text' && (
        <ColorPalette
          noneLabel={t('removeColor')}
          noneIcon={<NoFill />}
          onPick={(c) => applyText(c)}
          onNone={() => applyText(null)}
        />
      )}
    </div>
  )
}
