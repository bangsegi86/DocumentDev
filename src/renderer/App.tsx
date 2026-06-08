import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { buildExtensions } from './editor/extensions'
import { Toolbar } from './editor/toolbar/Toolbar'
import { TocSidebar } from './toc/TocSidebar'
import { useToc } from './toc/useToc'
import { ThemePanel } from './theme/ThemePanel'
import { themeToStyle } from './theme/themeToCss'
import { I18nProvider, useI18n } from './i18n/I18nContext'
import { useDocumentStore } from './state/documentStore'
import { newDocument, openDocument, saveDocument, saveDocumentAs } from './state/fileActions'
import type { MenuAction } from '@shared/types'

function AppHeader({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onToggleLang
}: {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onToggleLang: () => void
}): JSX.Element {
  const { t, lang } = useI18n()
  const dirty = useDocumentStore((s) => s.dirty)
  return (
    <header className="app-header">
      <span className="app-brand">DocumentDev</span>
      <button onClick={onNew}>{t('newDoc')}</button>
      <button onClick={onOpen}>{t('open')}</button>
      <button onClick={onSave}>{t('save')}{dirty ? ' •' : ''}</button>
      <button onClick={onSaveAs}>{t('saveAs')}</button>
      <span className="app-header-spacer" />
      <button className="lang-toggle" onClick={onToggleLang} title={t('language')}>
        {lang === 'ko' ? '한국어 / EN' : 'EN / 한국어'}
      </button>
    </header>
  )
}

function EditableTitle(): JSX.Element {
  const title = useDocumentStore((s) => s.title)
  const setTitle = useDocumentStore((s) => s.setTitle)
  return (
    <input
      className="doc-title-input"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      spellCheck={false}
    />
  )
}

function Workbench(): JSX.Element {
  const { t, lang } = useI18n()
  const theme = useDocumentStore((s) => s.theme)
  const markDirty = useDocumentStore((s) => s.markDirty)
  const setLang = useDocumentStore((s) => s.setLang)

  const editor = useEditor({
    extensions: buildExtensions({ placeholder: t('bodyContentPlaceholder') }),
    content: '',
    onUpdate: () => markDirty()
  })

  const toc = useToc(editor)

  const scrollToHeading = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleLang = (): void => {
    const next = lang === 'ko' ? 'en' : 'ko'
    setLang(next)
    window.api.setMenuLang(next)
  }

  // Wire native menu actions (and keyboard accelerators) to the same handlers.
  useEffect(() => {
    if (!editor) return
    const handlers: Record<MenuAction, () => void> = {
      new: () => newDocument(editor),
      open: () => void openDocument(editor),
      save: () => void saveDocument(editor),
      saveAs: () => void saveDocumentAs(editor),
      toggleLang,
      toggleTheme: () => {}
    }
    const off = window.api.onMenuAction((action) => handlers[action]?.())
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, lang])

  if (!editor) return <div className="loading">Loading…</div>

  return (
    <div className="app">
      <AppHeader
        onNew={() => newDocument(editor)}
        onOpen={() => void openDocument(editor)}
        onSave={() => void saveDocument(editor)}
        onSaveAs={() => void saveDocumentAs(editor)}
        onToggleLang={toggleLang}
      />
      <Toolbar editor={editor} />
      <div className="app-body">
        <div className="doc-root" style={themeToStyle(theme)}>
          <header className="doc-topbar">
            <EditableTitle />
          </header>
          <div className="doc-layout">
            <TocSidebar items={toc} onSelect={scrollToHeading} />
            <main className="doc-content">
              <EditorContent editor={editor} />
            </main>
          </div>
        </div>
        <ThemePanel />
      </div>
    </div>
  )
}

export default function App(): JSX.Element {
  const lang = useDocumentStore((s) => s.lang)
  return (
    <I18nProvider lang={lang}>
      <Workbench />
    </I18nProvider>
  )
}
