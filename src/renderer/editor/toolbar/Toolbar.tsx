import { useEffect, useRef, useState } from 'react'
import { useEditorState, type Editor } from '@tiptap/react'
import { useI18n } from '../../i18n/I18nContext'
import { CODE_LANGUAGES } from '../../lib/languages'
import { TableGridPicker } from './TableGridPicker'
import { PRESET_COLORS } from '../../theme/ColorField'
import { addNumberColumn } from '../tableNumber'
import {
  InsertRowAbove,
  InsertRowBelow,
  InsertColLeft,
  InsertColRight,
  DeleteRow,
  DeleteColumn,
  HeaderRow,
  DeleteTable
} from './tableIcons'

interface BtnProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function Btn({ onClick, active, disabled, title, children }: BtnProps): JSX.Element {
  return (
    <button
      type="button"
      className={`tb-btn ${active ? 'active' : ''}`}
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Sep(): JSX.Element {
  return <span className="tb-sep" />
}

/** "A" button with a color palette popover for setting selected text color. */
function TextColorControl({ editor }: { editor: Editor }): JSX.Element {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = useEditorState({
    editor,
    selector: ({ editor }) => (editor.getAttributes('textStyle').color as string) || '#1f2937'
  })

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="tb-popover-host" ref={ref}>
      <button
        type="button"
        className="tb-btn tb-color-btn"
        title={t('textColor')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="tb-color-A" style={{ borderBottomColor: current }}>
          A
        </span>
      </button>
      {open && (
        <div className="color-palette tb-color-palette">
          <div className="color-grid">
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className="color-swatch"
                style={{ background: c }}
                title={c}
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
            className="tb-color-remove"
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

/** Image insert button with a popover: upload from computer or insert by URL. */
function ImageInsertControl({ editor }: { editor: Editor }): JSX.Element {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const fromFile = async (): Promise<void> => {
    setOpen(false)
    const res = await window.api.openImage()
    if (!res.canceled && res.dataUri) editor.chain().focus().setImage({ src: res.dataUri }).run()
  }
  const fromUrl = (): void => {
    setOpen(false)
    const url = window.prompt(t('imagePrompt'))
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  return (
    <div className="tb-popover-host" ref={ref}>
      <button
        type="button"
        className="tb-btn"
        title={t('image')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        🖼
      </button>
      {open && (
        <div className="tb-menu">
          <button type="button" className="tb-menu-item" onMouseDown={(e) => e.preventDefault()} onClick={() => void fromFile()}>
            📁 {t('imageFromFile')}
          </button>
          <button type="button" className="tb-menu-item" onMouseDown={(e) => e.preventDefault()} onClick={fromUrl}>
            🔗 {t('imageFromUrl')}
          </button>
        </div>
      )}
    </div>
  )
}

export function Toolbar({
  editor,
  themeOpen,
  onToggleTheme
}: {
  editor: Editor
  themeOpen: boolean
  onToggleTheme: () => void
}): JSX.Element {
  const { t } = useI18n()
  const [showGrid, setShowGrid] = useState(false)

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
  const inCodeBlock = s.inCodeBlock
  const inTable = s.inTable
  const currentLang = s.codeLang

  const toggleLink = (): void => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const url = window.prompt(t('insertLinkPrompt'))
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  return (
    <div className="toolbar">
      <Btn onClick={() => editor.chain().focus().undo().run()} title={t('undo')} disabled={!s.canUndo}>↶</Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} title={t('redo')} disabled={!s.canRedo}>↷</Btn>
      <Sep />

      <Btn onClick={() => editor.chain().focus().setParagraph().run()} active={s.paragraph} title={t('paragraph')}>{t('paragraph')}</Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={s.h1} title={t('h1')}>{t('h1Short')}</Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={s.h2} title={t('h2')}>{t('h2Short')}</Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={s.h3} title={t('h3')}>{t('h3Short')}</Btn>
      <Sep />

      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={s.bold} title={t('bold')}><b>B</b></Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={s.italic} title={t('italic')}><i>I</i></Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={s.strike} title={t('strike')}><s>S</s></Btn>
      <TextColorControl editor={editor} />
      <Sep />

      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={s.bulletList} title={t('bulletList')}>•</Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={s.orderedList} title={t('orderedList')}>1.</Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={s.blockquote} title={t('blockquote')}>❝</Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title={t('horizontalRule')}>―</Btn>
      <Sep />

      <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={s.code} title={t('inlineCode')}>{'</>'}</Btn>
      <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={inCodeBlock} title={t('codeBlock')}>{'{ }'}</Btn>
      {inCodeBlock && (
        <select
          className="tb-select"
          value={currentLang}
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
      <Sep />

      <div className="tb-popover-host">
        <Btn onClick={() => setShowGrid((v) => !v)} active={inTable} title={t('table')}>▦</Btn>
        {showGrid && (
          <TableGridPicker
            onPick={(rows, cols) => {
              editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
              setShowGrid(false)
            }}
          />
        )}
      </div>
      <ImageInsertControl editor={editor} />
      <Btn onClick={toggleLink} active={s.link} title={t('link')}>🔗</Btn>

      {inTable && (
        <>
          <Sep />
          <Btn onClick={() => editor.chain().focus().addRowBefore().run()} title={t('addRowBefore')}><InsertRowAbove /></Btn>
          <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title={t('addRowAfter')}><InsertRowBelow /></Btn>
          <Btn onClick={() => editor.chain().focus().addColumnBefore().run()} title={t('addColBefore')}><InsertColLeft /></Btn>
          <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title={t('addColAfter')}><InsertColRight /></Btn>
          <Btn onClick={() => editor.chain().focus().deleteRow().run()} title={t('deleteRow')}><DeleteRow /></Btn>
          <Btn onClick={() => editor.chain().focus().deleteColumn().run()} title={t('deleteCol')}><DeleteColumn /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeaderRow().run()} title={t('toggleHeaderRow')}><HeaderRow /></Btn>
          <Btn onClick={() => addNumberColumn(editor, t('numberColumnHeader'))} title={t('numberColumn')}>№</Btn>
          <Btn onClick={() => editor.chain().focus().deleteTable().run()} title={t('deleteTable')}><DeleteTable /></Btn>
        </>
      )}

      <span className="tb-spacer" />
      <Btn onClick={onToggleTheme} active={themeOpen} title={t('theme')}>🎨</Btn>
    </div>
  )
}
