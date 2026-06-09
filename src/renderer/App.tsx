import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { buildExtensions } from './editor/extensions'
import { Toolbar } from './editor/toolbar/Toolbar'
import { TocSidebar } from './toc/TocSidebar'
import { useToc } from './toc/useToc'
import type { TocItem } from './toc/toc'
import { ThemePanel } from './theme/ThemePanel'
import { themeToStyle } from './theme/themeToCss'
import { I18nProvider, useI18n } from './i18n/I18nContext'
import { useDocumentStore } from './state/documentStore'
import { TableContextMenu } from './editor/menus/TableContextMenu'
import { ImageMenu } from './editor/menus/ImageMenu'
import { FindReplaceBar } from './editor/menus/FindReplaceBar'
import {
  newDocument,
  openDocument,
  saveDocument,
  saveDocumentAs,
  exportWordDocument
} from './state/fileActions'
import type { MenuAction } from '@shared/types'

/** Shared SVG props for the 18px line icons used in the header. */
const ICON = {
  viewBox: '0 0 24 24',
  width: 18,
  height: 18,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
}

const NewIcon = (): JSX.Element => (
  <svg {...ICON}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
    <path d="M12 12v6M9 15h6" />
  </svg>
)
const OpenIcon = (): JSX.Element => (
  <svg {...ICON}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
)
const SaveIcon = (): JSX.Element => (
  <svg {...ICON}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M17 21v-8H7v8" />
    <path d="M7 3v5h8" />
  </svg>
)
function AppHeader({
  onNew,
  onOpen,
  onSave
}: {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
}): JSX.Element {
  const { t } = useI18n()
  const dirty = useDocumentStore((s) => s.dirty)
  return (
    <header className="app-header">
      <span className="app-brand">DocumentDev</span>
      <button className="icon-btn" onClick={onNew} title={t('newDoc')} aria-label={t('newDoc')}>
        <NewIcon />
      </button>
      <button className="icon-btn" onClick={onOpen} title={t('open')} aria-label={t('open')}>
        <OpenIcon />
      </button>
      <button
        className={`icon-btn save-icon ${dirty ? 'dirty' : ''}`}
        onClick={onSave}
        title={t('save')}
        aria-label={t('save')}
      >
        <SaveIcon />
      </button>
      <span className="app-header-spacer" />
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

/** Square logo/CI in the top bar (editor): click to replace, × to remove. */
function TopbarLogo({ onReplace }: { onReplace: () => void }): JSX.Element | null {
  const { t } = useI18n()
  const logo = useDocumentStore((s) => s.theme.logoDataUrl)
  const setTheme = useDocumentStore((s) => s.setTheme)
  if (!logo) return null
  return (
    <span className="doc-logo-wrap">
      <img className="doc-logo" src={logo} alt="logo" title={t('topbarLogo')} onClick={onReplace} />
      <button
        className="doc-logo-remove"
        title={t('removeLogo')}
        onClick={() => setTheme({ logoDataUrl: '' })}
      >
        ×
      </button>
    </span>
  )
}

/**
 * Live "you are here" trail (H1 › H2 › H3) for the heading section currently at
 * the top of the scrolled content area. Recomputes on scroll and when headings
 * change. Deeper levels reset when a higher-level heading is passed.
 */
function useScrollTrail(container: HTMLElement | null, items: TocItem[]): TocItem[] {
  const [trail, setTrail] = useState<TocItem[]>([])
  const itemsRef = useRef<TocItem[]>(items)
  itemsRef.current = items
  const computeRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!container) return
    // Measuring getBoundingClientRect() forces layout — only do it on scroll
    // (and once when headings change), never on every keystroke.
    const compute = (): void => {
      const threshold = container.getBoundingClientRect().top + 90
      let h1: TocItem | null = null
      let h2: TocItem | null = null
      let h3: TocItem | null = null
      for (const item of itemsRef.current) {
        const el = document.getElementById(item.id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= threshold) {
          if (item.level === 1) {
            h1 = item
            h2 = null
            h3 = null
          } else if (item.level === 2) {
            h2 = item
            h3 = null
          } else {
            h3 = item
          }
        } else {
          break // headings are in document order
        }
      }
      const next = [h1, h2, h3].filter((x): x is TocItem => x !== null)
      setTrail((prev) =>
        prev.length === next.length && prev.every((p, i) => p.id === next[i].id) ? prev : next
      )
    }
    computeRef.current = compute
    compute()
    container.addEventListener('scroll', compute, { passive: true })
    return () => container.removeEventListener('scroll', compute)
  }, [container])

  // When headings change, recompute once (no scroll-listener churn).
  useEffect(() => {
    const id = requestAnimationFrame(() => computeRef.current())
    return () => cancelAnimationFrame(id)
  }, [items])

  return trail
}

function Breadcrumb({
  trail,
  onSelect
}: {
  trail: TocItem[]
  onSelect: (id: string) => void
}): JSX.Element {
  return (
    <div className="doc-breadcrumb">
      {trail.length === 0 ? (
        <span className="crumb-empty" />
      ) : (
        trail.map((item, i) => (
          <span className="crumb" key={item.id}>
            {i > 0 && <span className="crumb-sep">›</span>}
            <a onClick={() => onSelect(item.id)}>{item.text}</a>
          </span>
        ))
      )}
    </div>
  )
}

function Workbench(): JSX.Element {
  const { t, lang } = useI18n()
  const theme = useDocumentStore((s) => s.theme)
  const markDirty = useDocumentStore((s) => s.markDirty)
  const setLang = useDocumentStore((s) => s.setLang)

  const [spellcheck, setSpellcheck] = useState(false)

  const editor = useEditor({
    extensions: buildExtensions({ placeholder: t('bodyContentPlaceholder') }),
    content: '',
    // Don't re-render the whole Workbench on every transaction (typing perf).
    // Components that need live editor state subscribe via useEditorState.
    shouldRerenderOnTransaction: false,
    // Spellcheck starts off; the toolbar toggle controls it (see effect below).
    editorProps: { attributes: { spellcheck: 'false' } },
    onUpdate: () => markDirty()
  })

  // Apply the spellcheck toggle to the editable surface.
  useEffect(() => {
    if (editor) editor.view.dom.setAttribute('spellcheck', String(spellcheck))
  }, [editor, spellcheck])

  const toc = useToc(editor)
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null)
  const trail = useScrollTrail(contentEl, toc)
  const [showFind, setShowFind] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [themeOpen, setThemeOpen] = useState(false)

  // Ctrl/Cmd+F opens Find & Replace.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setShowFind(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const scrollToHeading = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleLang = (): void => {
    const next = lang === 'ko' ? 'en' : 'ko'
    setLang(next)
    window.api.setMenuLang(next)
  }

  const pickLogo = async (): Promise<void> => {
    const res = await window.api.openImage()
    if (!res.canceled && res.dataUri) {
      useDocumentStore.getState().setTheme({ logoDataUrl: res.dataUri })
    }
  }

  // Wire native menu actions (and keyboard accelerators) to the same handlers.
  useEffect(() => {
    if (!editor) return
    const handlers: Record<MenuAction, () => void> = {
      new: () => newDocument(editor),
      open: () => void openDocument(editor),
      save: () => void saveDocument(editor),
      saveAs: () => void saveDocumentAs(editor),
      exportWord: () => void exportWordDocument(editor),
      find: () => setShowFind(true),
      toggleLang,
      toggleSpellcheck: () => setSpellcheck((v) => !v),
      toggleTheme: () => setThemeOpen((v) => !v)
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
      />
      <Toolbar
        editor={editor}
        themeOpen={themeOpen}
        onToggleTheme={() => setThemeOpen((v) => !v)}
      />
      <TableContextMenu editor={editor} />
      <ImageMenu editor={editor} />
      <div className="app-body">
        {showFind && <FindReplaceBar editor={editor} onClose={() => setShowFind(false)} />}
        <div className={`doc-root ${sidebarOpen ? '' : 'sidebar-collapsed'}`} style={themeToStyle(theme)}>
          <header className="doc-topbar">
            <TopbarLogo onReplace={() => void pickLogo()} />
            <span className="doc-topbar-title">
              <EditableTitle />
            </span>
          </header>
          <div className="doc-layout">
            <TocSidebar
              items={toc}
              onSelect={scrollToHeading}
              collapsed={!sidebarOpen}
              onToggle={() => setSidebarOpen((v) => !v)}
            />
            <div className="doc-main">
              <Breadcrumb trail={trail} onSelect={scrollToHeading} />
              <main className="doc-content" ref={setContentEl}>
                <EditorContent editor={editor} />
              </main>
            </div>
          </div>
        </div>
        {themeOpen && <ThemePanel />}
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
