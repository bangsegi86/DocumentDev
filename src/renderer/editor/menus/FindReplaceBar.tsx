import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useI18n } from '../../i18n/I18nContext'
import { getSearchState } from '../extensions/SearchReplace'

/** Floating Find & Replace bar (toggled with Ctrl+F, closed with Esc). */
export function FindReplaceBar({
  editor,
  onClose
}: {
  editor: Editor
  onClose: () => void
}): JSX.Element {
  const { t } = useI18n()
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [info, setInfo] = useState({ total: 0, current: 0 })
  const findRef = useRef<HTMLInputElement>(null)

  // Focus the find field when the bar opens; seed from the current selection.
  useEffect(() => {
    const { from, to } = editor.state.selection
    const selected = from !== to ? editor.state.doc.textBetween(from, to) : ''
    if (selected) {
      setFind(selected)
      editor.commands.setSearchTerm(selected)
    }
    findRef.current?.focus()
    findRef.current?.select()
    return () => {
      editor.commands.clearSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mirror match count / current index from the plugin on every transaction.
  useEffect(() => {
    const update = (): void => {
      const s = getSearchState(editor.state)
      setInfo({ total: s.matches.length, current: s.matches.length ? s.current + 1 : 0 })
    }
    update()
    editor.on('transaction', update)
    return () => {
      editor.off('transaction', update)
    }
  }, [editor])

  const onFindChange = (value: string): void => {
    setFind(value)
    editor.commands.setSearchTerm(value)
  }

  const toggleCase = (): void => {
    const next = !caseSensitive
    setCaseSensitive(next)
    editor.commands.setSearchCaseSensitive(next)
  }

  return (
    <div className="find-bar" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="find-row">
        <input
          ref={findRef}
          className="find-input"
          placeholder={t('findPlaceholder')}
          value={find}
          onChange={(e) => onFindChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (e.shiftKey) editor.commands.findPrevious()
              else editor.commands.findNext()
            }
          }}
        />
        <span className="find-count">
          {info.total > 0 ? `${info.current} / ${info.total}` : t('noMatches')}
        </span>
        <button className="find-btn" title={t('prevMatch')} onClick={() => editor.commands.findPrevious()}>
          ↑
        </button>
        <button className="find-btn" title={t('nextMatch')} onClick={() => editor.commands.findNext()}>
          ↓
        </button>
        <button
          className={`find-btn ${caseSensitive ? 'active' : ''}`}
          title={t('matchCase')}
          onClick={toggleCase}
        >
          Aa
        </button>
        <button className="find-btn" title={t('closeFind')} onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="find-row">
        <input
          className="find-input"
          placeholder={t('replacePlaceholder')}
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              editor.commands.replaceCurrent(replace)
            }
          }}
        />
        <button className="find-btn find-btn-wide" onClick={() => editor.commands.replaceCurrent(replace)}>
          {t('replaceOne')}
        </button>
        <button className="find-btn find-btn-wide" onClick={() => editor.commands.replaceAll(replace)}>
          {t('replaceAll')}
        </button>
      </div>
    </div>
  )
}
