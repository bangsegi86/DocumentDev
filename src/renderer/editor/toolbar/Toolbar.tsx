import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useI18n } from '../../i18n/I18nContext'
import { CODE_LANGUAGES } from '../../lib/languages'
import { TableGridPicker } from './TableGridPicker'

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

export function Toolbar({ editor }: { editor: Editor }): JSX.Element {
  const { t } = useI18n()
  const [showGrid, setShowGrid] = useState(false)

  const inCodeBlock = editor.isActive('codeBlock')
  const inTable = editor.isActive('table')
  const currentLang = (editor.getAttributes('codeBlock').language as string) || 'plaintext'

  const insertImage = (): void => {
    const url = window.prompt(t('imagePrompt'))
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

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
      <Btn onClick={() => editor.chain().focus().undo().run()} title={t('undo')} disabled={!editor.can().undo()}>↶</Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} title={t('redo')} disabled={!editor.can().redo()}>↷</Btn>
      <Sep />

      <select
        className="tb-select"
        value={
          editor.isActive('heading', { level: 1 })
            ? 'h1'
            : editor.isActive('heading', { level: 2 })
              ? 'h2'
              : editor.isActive('heading', { level: 3 })
                ? 'h3'
                : 'p'
        }
        onChange={(e) => {
          const v = e.target.value
          const chain = editor.chain().focus()
          if (v === 'p') chain.setParagraph().run()
          else chain.toggleHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run()
        }}
      >
        <option value="p">{t('paragraph')}</option>
        <option value="h1">{t('h1')}</option>
        <option value="h2">{t('h2')}</option>
        <option value="h3">{t('h3')}</option>
      </select>
      <Sep />

      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title={t('bold')}><b>B</b></Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title={t('italic')}><i>I</i></Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title={t('strike')}><s>S</s></Btn>
      <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title={t('inlineCode')}>{'</>'}</Btn>
      <Sep />

      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title={t('bulletList')}>•</Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title={t('orderedList')}>1.</Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title={t('blockquote')}>❝</Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title={t('horizontalRule')}>―</Btn>
      <Sep />

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
      <Btn onClick={insertImage} title={t('image')}>🖼</Btn>
      <Btn onClick={toggleLink} active={editor.isActive('link')} title={t('link')}>🔗</Btn>

      {inTable && (
        <>
          <Sep />
          <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title={t('addRowAfter')}>+R</Btn>
          <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title={t('addColAfter')}>+C</Btn>
          <Btn onClick={() => editor.chain().focus().deleteRow().run()} title={t('deleteRow')}>−R</Btn>
          <Btn onClick={() => editor.chain().focus().deleteColumn().run()} title={t('deleteCol')}>−C</Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeaderRow().run()} title={t('toggleHeaderRow')}>⊤</Btn>
          <Btn onClick={() => editor.chain().focus().deleteTable().run()} title={t('deleteTable')}>✕▦</Btn>
        </>
      )}
    </div>
  )
}
