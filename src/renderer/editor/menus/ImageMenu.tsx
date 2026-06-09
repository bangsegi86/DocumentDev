import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useI18n } from '../../i18n/I18nContext'

interface Pos {
  top: number
  left: number
}

/** Floating controls shown when an image is selected: alignment, width, alt,
 *  plus confirm (deselect) and delete (with a confirmation modal). */
export function ImageMenu({ editor }: { editor: Editor }): JSX.Element | null {
  const { t } = useI18n()
  const [pos, setPos] = useState<Pos | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const update = (): void => {
      if (!editor.isActive('image')) {
        setPos(null)
        setConfirmDelete(false)
        return
      }
      const coords = editor.view.coordsAtPos(editor.state.selection.from)
      setPos({ top: coords.top, left: coords.left })
    }
    update()
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  const deselect = (): void => {
    // Move the cursor just after the image node to clear the node selection.
    editor.chain().focus().setTextSelection(editor.state.selection.to).run()
  }
  const deleteImage = (): void => {
    setConfirmDelete(false)
    editor.chain().focus().deleteSelection().run()
  }

  // Esc cancels: close the modal if open, otherwise deselect the image.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (confirmDelete) {
        e.preventDefault()
        setConfirmDelete(false)
      } else if (editor.isActive('image')) {
        e.preventDefault()
        deselect()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, confirmDelete])

  if (!pos) return null

  const attrs = editor.getAttributes('image') as { width?: number | null; align?: string | null; alt?: string }
  const align = attrs.align ?? null

  const setAlign = (value: string): void => {
    editor.chain().focus().updateAttributes('image', { align: align === value ? null : value }).run()
  }
  const setWidth = (w: number | null): void => {
    editor.chain().updateAttributes('image', { width: w }).run()
  }
  const presetWidth = (frac: number): void => {
    const cw = (editor.view.dom as HTMLElement).clientWidth || 600
    setWidth(Math.round(cw * frac))
  }

  const style: React.CSSProperties = {
    top: Math.max(8, pos.top - 46),
    left: Math.min(pos.left, window.innerWidth - 470)
  }

  return (
    <>
      <div className="image-menu" style={style} onMouseDown={(e) => e.preventDefault()}>
        <button className={`im-btn ${align === 'left' ? 'active' : ''}`} title={t('alignLeft')} onClick={() => setAlign('left')}>⌶◀</button>
        <button className={`im-btn ${align === 'center' ? 'active' : ''}`} title={t('alignCenter')} onClick={() => setAlign('center')}>▣</button>
        <button className={`im-btn ${align === 'right' ? 'active' : ''}`} title={t('alignRight')} onClick={() => setAlign('right')}>▶⌶</button>
        <span className="im-sep" />
        <button className="im-btn" onClick={() => presetWidth(0.25)}>25%</button>
        <button className="im-btn" onClick={() => presetWidth(0.5)}>50%</button>
        <button className="im-btn" onClick={() => presetWidth(1)}>100%</button>
        <input
          className="im-width"
          type="number"
          min={40}
          title={t('imageWidth')}
          value={attrs.width ?? ''}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => setWidth(e.target.value ? parseInt(e.target.value, 10) : null)}
        />
        <span className="im-sep" />
        <input
          className="im-alt"
          type="text"
          placeholder={t('imageAltText')}
          value={attrs.alt ?? ''}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => editor.chain().updateAttributes('image', { alt: e.target.value }).run()}
        />
        <span className="im-sep" />
        <button className="im-btn im-confirm" onClick={deselect}>{t('imageConfirm')}</button>
        <button className="im-btn im-delete" onClick={() => setConfirmDelete(true)}>{t('imageDelete')}</button>
      </div>

      {confirmDelete && (
        <div className="modal-overlay" onMouseDown={() => setConfirmDelete(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <p className="modal-title">{t('deleteImageQuestion')}</p>
            <div className="modal-actions">
              <button className="modal-btn" onClick={() => setConfirmDelete(false)}>{t('cancel')}</button>
              <button className="modal-btn modal-btn-danger" onClick={deleteImage}>{t('imageDelete')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
