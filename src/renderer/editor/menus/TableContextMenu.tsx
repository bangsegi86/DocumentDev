import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useI18n } from '../../i18n/I18nContext'
import { PRESET_COLORS } from '../../theme/ColorField'

interface MenuState {
  x: number
  y: number
}

/** Right-click menu inside tables: set cell background color (and text color). */
export function TableContextMenu({ editor }: { editor: Editor }): JSX.Element | null {
  const { t } = useI18n()
  const [menu, setMenu] = useState<MenuState | null>(null)

  useEffect(() => {
    const dom = editor.view.dom
    const onContext = (e: MouseEvent): void => {
      if (!editor.isActive('table')) return
      e.preventDefault()
      setMenu({ x: e.clientX, y: e.clientY })
    }
    dom.addEventListener('contextmenu', onContext)
    return () => dom.removeEventListener('contextmenu', onContext)
  }, [editor])

  useEffect(() => {
    if (!menu) return
    const close = (): void => setMenu(null)
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

  const setCellBg = (color: string | null): void => {
    editor.chain().focus().setCellAttribute('backgroundColor', color).run()
    setMenu(null)
  }
  const setTextColor = (color: string | null): void => {
    const chain = editor.chain().focus()
    if (color) chain.setColor(color).run()
    else chain.unsetColor().run()
    setMenu(null)
  }

  // Keep the menu within the viewport.
  const style: React.CSSProperties = {
    left: Math.min(menu.x, window.innerWidth - 230),
    top: Math.min(menu.y, window.innerHeight - 230)
  }

  return (
    <div
      className="ctx-menu"
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="ctx-section">{t('cellBackground')}</div>
      <div className="ctx-grid">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="color-swatch"
            style={{ background: c }}
            title={c}
            onClick={() => setCellBg(c)}
          />
        ))}
      </div>
      <button type="button" className="ctx-item" onClick={() => setCellBg(null)}>
        {t('noFill')}
      </button>

      <div className="ctx-divider" />

      <div className="ctx-section">{t('textColor')}</div>
      <div className="ctx-grid">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="color-swatch"
            style={{ background: c }}
            title={c}
            onClick={() => setTextColor(c)}
          />
        ))}
      </div>
      <button type="button" className="ctx-item" onClick={() => setTextColor(null)}>
        {t('removeColor')}
      </button>
    </div>
  )
}
