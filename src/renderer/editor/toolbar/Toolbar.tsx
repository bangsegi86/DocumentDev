import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useEditorState, type Editor } from '@tiptap/react'
import { useI18n } from '../../i18n/I18nContext'
import { CODE_LANGUAGES } from '../../lib/languages'
import { TableGridPicker } from './TableGridPicker'
import { PRESET_COLORS } from '../../theme/ColorField'
import { addNumberColumn } from '../tableNumber'
import { autoFitTable } from '../tableAutoFit'
import { downscaleDataUri } from '../../lib/downscaleImage'
import { Icon } from '../../ui/icons'
import {
  InsertRowAbove,
  InsertRowBelow,
  InsertColLeft,
  InsertColRight,
  DeleteRow,
  DeleteColumn,
  HeaderRow,
  DeleteTable,
  AutoFitTable
} from './tableIcons'

interface BtnProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  className?: string
  children: React.ReactNode
}

/** Toolbar button. Keeps editor focus (mousedown is swallowed) and exposes its
 *  toggle state to assistive tech via aria-pressed. */
function Btn({ onClick, active, disabled, title, className, children }: BtnProps): JSX.Element {
  return (
    <button
      type="button"
      className={`tb-btn ${active ? 'active' : ''} ${className ?? ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/**
 * Position a popover under its toolbar button with `position: fixed`, so it is
 * never clipped by the toolbar (which scrolls horizontally on narrow windows).
 */
function useAnchoredStyle(
  open: boolean,
  hostRef: React.RefObject<HTMLDivElement>,
  width = 220
): React.CSSProperties | undefined {
  const [style, setStyle] = useState<React.CSSProperties>()
  useLayoutEffect(() => {
    if (!open || !hostRef.current) return
    const r = hostRef.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    setStyle({ position: 'fixed', top: r.bottom + 6, left })
  }, [open, hostRef, width])
  return style
}

/** Close a popover when clicking anywhere outside `ref`. */
function useOutsideClose(open: boolean, setOpen: (v: boolean) => void): React.RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])
  return ref
}

/** Text colour: "A" icon whose underline shows the current colour + palette. */
function TextColorControl({ editor }: { editor: Editor }): JSX.Element {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose(open, setOpen)
  const pos = useAnchoredStyle(open, ref, 216)
  const current = useEditorState({
    editor,
    selector: ({ editor }) => (editor.getAttributes('textStyle').color as string) || ''
  })

  return (
    <div className="tb-popover-host" ref={ref}>
      <Btn onClick={() => setOpen(!open)} active={open} title={t('textColor')} className="tb-btn-color">
        <Icon name="textColor" />
        <span className="tb-color-bar" style={{ background: current || 'currentColor' }} />
      </Btn>
      {open && (
        <div className="tb-popover color-palette" style={pos}>
          <div className="color-grid">
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`color-swatch ${c === current ? 'active' : ''}`}
                style={{ background: c }}
                title={c}
                aria-label={c}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().setColor(c).run()
                  setOpen(false)
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="tb-popover-action"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().unsetColor().run()
              setOpen(false)
            }}
          >
            {t('removeColor')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Image insert: from a file on this computer, or by URL. */
function ImageInsertControl({ editor }: { editor: Editor }): JSX.Element {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose(open, setOpen)
  const pos = useAnchoredStyle(open, ref, 200)

  const fromFile = async (): Promise<void> => {
    setOpen(false)
    const res = await window.api.openImage()
    if (res.canceled || !res.dataUri) return
    const src = await downscaleDataUri(res.dataUri)
    editor.chain().focus().setImage({ src }).run()
  }
  const fromUrl = (): void => {
    setOpen(false)
    const url = window.prompt(t('imagePrompt'))
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  return (
    <div className="tb-popover-host" ref={ref}>
      <Btn onClick={() => setOpen(!open)} active={open} title={t('image')}>
        <Icon name="image" />
      </Btn>
      {open && (
        <div className="tb-popover tb-menu" role="menu" style={pos}>
          <button type="button" role="menuitem" className="tb-menu-item" onMouseDown={(e) => e.preventDefault()} onClick={() => void fromFile()}>
            <Icon name="folderOpen" size={16} />
            {t('imageFromFile')}
          </button>
          <button type="button" role="menuitem" className="tb-menu-item" onMouseDown={(e) => e.preventDefault()} onClick={fromUrl}>
            <Icon name="link" size={16} />
            {t('imageFromUrl')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Table insert: grid picker for rows × columns. */
function TableInsertControl({ editor, inTable }: { editor: Editor; inTable: boolean }): JSX.Element {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose(open, setOpen)
  const pos = useAnchoredStyle(open, ref, 200)
  return (
    <div className="tb-popover-host" ref={ref}>
      <Btn onClick={() => setOpen(!open)} active={open || inTable} title={t('table')}>
        <Icon name="table" />
      </Btn>
      {open && (
        <div className="tb-popover" style={pos}>
          <TableGridPicker
            onPick={(rows, cols) => {
              editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

export function Toolbar({
  editor,
  themeOpen,
  onToggleTheme,
  onFind
}: {
  editor: Editor
  themeOpen: boolean
  onToggleTheme: () => void
  onFind: () => void
}): JSX.Element {
  const { t } = useI18n()

  // Subscribe only to the toolbar's reactive flags (deepEqual): the toolbar
  // re-renders when formatting state changes, NOT on every keystroke.
  const s = useEditorState({
    editor,
    selector: ({ editor }) => ({
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
      paragraph: editor.isActive('paragraph'),
      h1: editor.isActive('heading', { level: 1 }),
      h2: editor.isActive('heading', { level: 2 }),
      h3: editor.isActive('heading', { level: 3 }),
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      strike: editor.isActive('strike'),
      code: editor.isActive('code'),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
      inCodeBlock: editor.isActive('codeBlock'),
      codeLang: (editor.getAttributes('codeBlock').language as string) || 'plaintext',
      inTable: editor.isActive('table'),
      link: editor.isActive('link')
    })
  })

  const toggleLink = (): void => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const url = window.prompt(t('insertLinkPrompt'))
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  const blockStyles = [
    { key: 'p', label: t('paragraph'), title: t('paragraph'), active: s.paragraph, run: () => editor.chain().focus().setParagraph().run() },
    { key: 'h1', label: t('h1Short'), title: t('h1'), active: s.h1, run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { key: 'h2', label: t('h2Short'), title: t('h2'), active: s.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: 'h3', label: t('h3Short'), title: t('h3'), active: s.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() }
  ]

  return (
    <div className="toolbar" role="toolbar" aria-label={t('formatting')}>
      <div className="tb-group">
        <Btn onClick={() => editor.chain().focus().undo().run()} title={t('undo')} disabled={!s.canUndo}>
          <Icon name="undo" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title={t('redo')} disabled={!s.canRedo}>
          <Icon name="redo" />
        </Btn>
      </div>

      <div className="tb-group">
        <div className="tb-seg" role="group" aria-label={t('blockStyle')}>
          {blockStyles.map((b) => (
            <button
              key={b.key}
              type="button"
              className={`tb-seg-btn tb-seg-${b.key} ${b.active ? 'active' : ''}`}
              title={b.title}
              aria-pressed={b.active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={b.run}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tb-group">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={s.bold} title={t('bold')}>
          <Icon name="bold" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={s.italic} title={t('italic')}>
          <Icon name="italic" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={s.strike} title={t('strike')}>
          <Icon name="strike" />
        </Btn>
        <TextColorControl editor={editor} />
      </div>

      <div className="tb-group">
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={s.bulletList} title={t('bulletList')}>
          <Icon name="bulletList" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={s.orderedList} title={t('orderedList')}>
          <Icon name="orderedList" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={s.blockquote} title={t('blockquote')}>
          <Icon name="quote" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title={t('horizontalRule')}>
          <Icon name="divider" />
        </Btn>
      </div>

      <div className="tb-group">
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={s.code} title={t('inlineCode')}>
          <Icon name="inlineCode" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={s.inCodeBlock} title={t('codeBlock')}>
          <Icon name="codeBlock" />
        </Btn>
        {s.inCodeBlock && (
          <select
            className="tb-select"
            title={t('codeLanguage')}
            aria-label={t('codeLanguage')}
            value={s.codeLang}
            onChange={(e) =>
              editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value }).run()
            }
          >
            {CODE_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="tb-group">
        <TableInsertControl editor={editor} inTable={s.inTable} />
        <ImageInsertControl editor={editor} />
        <Btn onClick={toggleLink} active={s.link} title={s.link ? t('unlink') : t('link')}>
          <Icon name="link" />
        </Btn>
      </div>

      {s.inTable && (
        <div className="tb-group tb-context" role="group" aria-label={t('tableTools')}>
          <span className="tb-context-label">{t('tableTools')}</span>
          <Btn onClick={() => editor.chain().focus().addRowBefore().run()} title={t('addRowBefore')}><InsertRowAbove /></Btn>
          <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title={t('addRowAfter')}><InsertRowBelow /></Btn>
          <Btn onClick={() => editor.chain().focus().addColumnBefore().run()} title={t('addColBefore')}><InsertColLeft /></Btn>
          <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title={t('addColAfter')}><InsertColRight /></Btn>
          <span className="tb-mini-sep" />
          <Btn onClick={() => editor.chain().focus().toggleHeaderRow().run()} title={t('toggleHeaderRow')}><HeaderRow /></Btn>
          <Btn onClick={() => addNumberColumn(editor, t('numberColumnHeader'))} title={t('numberColumn')} className="tb-btn-text">
            №
          </Btn>
          <Btn onClick={() => autoFitTable(editor, t('numberColumnHeader'))} title={t('autoFitTable')}><AutoFitTable /></Btn>
          <span className="tb-mini-sep" />
          <Btn onClick={() => editor.chain().focus().deleteRow().run()} title={t('deleteRow')}><DeleteRow /></Btn>
          <Btn onClick={() => editor.chain().focus().deleteColumn().run()} title={t('deleteCol')}><DeleteColumn /></Btn>
          <Btn onClick={() => editor.chain().focus().deleteTable().run()} title={t('deleteTable')}><DeleteTable /></Btn>
        </div>
      )}

      <span className="tb-spacer" />

      <div className="tb-group tb-group-end">
        <Btn onClick={onFind} title={`${t('find')} (Ctrl+F)`}>
          <Icon name="search" />
        </Btn>
        <Btn onClick={onToggleTheme} active={themeOpen} title={t('theme')}>
          <Icon name="palette" />
        </Btn>
      </div>
    </div>
  )
}
