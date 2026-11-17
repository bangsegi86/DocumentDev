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
  saveDocument,
  saveDocumentAs,
  exportWordDocument,
  exportPdfDocument,
  printCurrentDocument
} from './state/fileActions'
import { TabBar } from './TabBar'
import { useTabsStore } from './state/tabsStore'
import {
  initTabs,
  newTab,
  openTab,
  closeTab,
  activateTab,
  autosaveRecovery,
  noteEdit,
  dropRecovery,
  anyTabDirty,
  saveAllTabs,
  maybeRestoreRecovery
} from './state/tabsActions'
import type { MenuAction } from '@shared/types'
import { APP_NAME } from '@shared/constants'
import { Icon, AppMark } from './ui/icons'
import { downscaleDataUri, MAX_LOGO_WIDTH } from './lib/downscaleImage'

/** File name shown in the app bar ("문서.html"), or null for a new document. */
function baseName(path: string | null): string | null {
  if (!path) return null
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || null
}

/** Export menu: secondary ways to write the document out. */
function ExportMenu({
  onSaveAs,
  onExportWord,
  onExportPdf,
  onPrint
}: {
  onSaveAs: () => void
  onExportWord: () => void
  onExportPdf: () => void
  onPrint: () => void
}): JSX.Element {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
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
  }, [open])
  const pick = (fn: () => void) => (): void => {
    setOpen(false)
    fn()
  }
  return (
    <div className="bar-menu-host" ref={ref}>
      <button
        type="button"
        className={`bar-btn ${open ? 'open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="download" size={16} />
        {t('exportMenu')}
        <Icon name="chevronDown" size={14} className="bar-caret" />
      </button>
      {open && (
        <div className="bar-menu" role="menu">
          <button type="button" role="menuitem" className="bar-menu-item" onClick={pick(onExportPdf)}>
            {t('exportPdfItem')}
            <kbd>Ctrl+Shift+E</kbd>
          </button>
          <button type="button" role="menuitem" className="bar-menu-item" onClick={pick(onExportWord)}>
            {t('exportWordItem')}
            <kbd>Ctrl+Shift+W</kbd>
          </button>
          <button type="button" role="menuitem" className="bar-menu-item" onClick={pick(onPrint)}>
            {t('printItem')}
            <kbd>Ctrl+P</kbd>
          </button>
          <div className="bar-menu-divider" />
          <button type="button" role="menuitem" className="bar-menu-item" onClick={pick(onSaveAs)}>
            {t('saveAsItem')}
            <kbd>Ctrl+Shift+S</kbd>
          </button>
        </div>
      )}
    </div>
  )
}

/** Split "open" control: the folder button opens the file dialog; the caret
 *  lists recent documents. */
function OpenControl({ onOpen, onOpenPath }: { onOpen: () => void; onOpenPath: (path: string) => void }): JSX.Element {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    void window.api.recentList().then(setRecent)
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
  }, [open])
  const split = (p: string): { name: string; dir: string } => {
    const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
    return { name: p.slice(i + 1), dir: p.slice(0, i) }
  }
  return (
    <div className="bar-menu-host bar-split" ref={ref}>
      <button type="button" className="bar-icon-btn" onClick={onOpen} title={`${t('open')} (Ctrl+O)`} aria-label={t('open')}>
        <Icon name="folderOpen" />
      </button>
      <button
        type="button"
        className={`bar-icon-btn bar-split-caret ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title={t('recentDocs')}
        aria-label={t('recentDocs')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="bar-menu bar-menu-left bar-menu-recent" role="menu">
          <div className="bar-menu-heading">{t('recentDocs')}</div>
          {recent.length === 0 ? (
            <div className="bar-menu-empty">{t('noRecentDocs')}</div>
          ) : (
            recent.map((p) => {
              const { name, dir } = split(p)
              return (
                <button
                  key={p}
                  type="button"
                  role="menuitem"
                  className="bar-menu-item bar-menu-file"
                  title={p}
                  onClick={() => {
                    setOpen(false)
                    onOpenPath(p)
                  }}
                >
                  <span className="bar-menu-file-name">{name}</span>
                  <span className="bar-menu-file-dir">
                    {/* rtl container puts the ellipsis at the start of a long
                        path; bdi keeps the path itself in normal order. */}
                    <bdi>{dir}</bdi>
                  </span>
                </button>
              )
            })
          )}
          <div className="bar-menu-divider" />
          <button
            type="button"
            role="menuitem"
            className="bar-menu-item"
            onClick={() => {
              setOpen(false)
              onOpen()
            }}
          >
            {t('openOther')}
            <kbd>Ctrl+O</kbd>
          </button>
          {recent.length > 0 && (
            <button
              type="button"
              role="menuitem"
              className="bar-menu-item bar-menu-subtle"
              onClick={() => {
                void window.api.clearRecent()
                setRecent([])
              }}
            >
              {t('clearRecentDocs')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AppHeader({
  onNew,
  onOpen,
  onOpenPath,
  onSave,
  onSaveAs,
  onExportWord,
  onExportPdf,
  onPrint
}: {
  onExportPdf: () => void
  onPrint: () => void
  onNew: () => void
  onOpen: () => void
  onOpenPath: (path: string) => void
  onSave: () => void
  onSaveAs: () => void
  onExportWord: () => void
}): JSX.Element {
  const { t } = useI18n()
  const dirty = useDocumentStore((s) => s.dirty)
  const filePath = useDocumentStore((s) => s.filePath)
  const name = baseName(filePath)
  const status = !filePath ? t('statusNew') : dirty ? t('statusUnsaved') : t('statusSaved')
  return (
    <header className="app-bar">
      <div className="app-id">
        <AppMark size={26} />
        <div className="app-file">
          <span className="app-file-name" title={filePath ?? undefined}>
            {name ?? APP_NAME}
          </span>
          <span className={`app-file-status ${dirty ? 'is-dirty' : !filePath ? 'is-new' : ''}`}>
            <span className="status-dot" aria-hidden="true" />
            {status}
          </span>
        </div>
      </div>
      <div className="app-actions">
        <button type="button" className="bar-icon-btn" onClick={onNew} title={`${t('newDoc')} (Ctrl+N)`} aria-label={t('newDoc')}>
          <Icon name="filePlus" />
        </button>
        <OpenControl onOpen={onOpen} onOpenPath={onOpenPath} />
        <span className="bar-sep" />
        <ExportMenu onSaveAs={onSaveAs} onExportWord={onExportWord} onExportPdf={onExportPdf} onPrint={onPrint} />
        <button
          type="button"
          className={`bar-btn bar-btn-primary ${dirty ? 'is-dirty' : ''}`}
          onClick={onSave}
          title={`${t('save')} (Ctrl+S)`}
        >
          <Icon name="save" size={16} />
          {t('save')}
        </button>
      </div>
    </header>
  )
}

function EditableTitle(): JSX.Element {
  const { t } = useI18n()
  const title = useDocumentStore((s) => s.title)
  const setTitle = useDocumentStore((s) => s.setTitle)
  return (
    <input
      className="doc-title-input"
      title={t('editTitleHint')}
      aria-label={t('documentTitle')}
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
  const dirty = useDocumentStore((s) => s.dirty)
  const docTitle = useDocumentStore((s) => s.title)
  const tabs = useTabsStore((s) => s.tabs)
  const activeId = useTabsStore((s) => s.activeId)

  const [spellcheck, setSpellcheck] = useState(false)

  const editor = useEditor({
    extensions: buildExtensions({ placeholder: t('bodyContentPlaceholder') }),
    content: '',
    // Don't re-render the whole Workbench on every transaction (typing perf).
    // Components that need live editor state subscribe via useEditorState.
    shouldRerenderOnTransaction: false,
    // Spellcheck starts off; the toolbar toggle controls it (see effect below).
    editorProps: { attributes: { spellcheck: 'false' } },
    onUpdate: () => {
      markDirty()
      noteEdit()
    }
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
      const logo = await downscaleDataUri(res.dataUri, MAX_LOGO_WIDTH)
      useDocumentStore.getState().setTheme({ logoDataUrl: logo })
    }
  }

  // Save the active document and drop its crash-recovery snapshot on success.
  const saveActive = async (): Promise<boolean> => {
    if (!editor) return false
    const saved = await saveDocument(editor)
    if (saved) dropRecovery(useTabsStore.getState().activeId)
    return saved
  }

  // Wire native menu actions (and keyboard accelerators) to the same handlers.
  useEffect(() => {
    if (!editor) return
    const handlers: Record<MenuAction, () => void> = {
      new: () => newTab(editor),
      open: () => void openTab(editor),
      save: () => void saveActive(),
      saveAs: () => void saveDocumentAs(editor),
      exportWord: () => void exportWordDocument(editor),
      exportPdf: () => void exportPdfDocument(editor),
      print: () => void printCurrentDocument(editor),
      find: () => setShowFind(true),
      toggleLang,
      toggleSpellcheck: () => setSpellcheck((v) => !v)
    }
    const off = window.api.onMenuAction((action) => handlers[action]?.())
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, lang])

  // Drag & drop files onto the window: .html documents open in a tab. Image
  // drops onto the editor are handled by the image extension. Anything else is
  // swallowed so the browser never navigates away from the editor.
  useEffect(() => {
    if (!editor) return
    const onDragOver = (e: DragEvent): void => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault()
    }
    const onDrop = (e: DragEvent): void => {
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length === 0) return
      const docs = files.filter((f) => /\.html?$/i.test(f.name))
      if (docs.length > 0 || !e.defaultPrevented) e.preventDefault()
      void (async () => {
        for (const f of docs) {
          await openTab(editor, { path: window.api.pathForFile(f) || null, contents: await f.text() })
        }
      })()
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [editor])

  // Seed the first tab, then offer to restore any crash-recovery snapshots.
  useEffect(() => {
    if (!editor) return
    initTabs(editor)
    let off = (): void => {}
    void maybeRestoreRecovery(editor).then(() => {
      // Documents handed over by the OS ("Open with", recent menu) open as tabs.
      off = window.api.onOpenFromOS((res) => void openTab(editor, res))
      window.api.rendererReady()
    })
    return () => off()
  }, [editor])

  // Periodic crash-recovery autosave. Cheap when idle: it only serializes a
  // tab whose content changed since its last snapshot, and waits for a pause
  // in typing so a large document never stalls a keystroke.
  useEffect(() => {
    if (!editor) return
    const timer = setInterval(() => autosaveRecovery(editor), 2000)
    return () => clearInterval(timer)
  }, [editor])

  // Reflect unsaved state to the OS window title and to the main process
  // (which guards window close against losing unsaved work in ANY tab).
  useEffect(() => {
    const unsaved = dirty || anyTabDirty()
    window.api.setDirty(unsaved)
    document.title = `${unsaved ? '• ' : ''}${docTitle || 'Untitled'} — ${APP_NAME}`
  }, [dirty, docTitle, tabs, activeId])

  // When closing with unsaved changes, the main process asks us to save first.
  useEffect(() => {
    if (!editor) return
    return window.api.onSaveForClose(() => {
      void saveAllTabs(editor).then((saved) => window.api.saveForCloseResult(saved))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, activeId])

  if (!editor) return <div className="loading">Loading…</div>

  return (
    <div className="app">
      <AppHeader
        onNew={() => newTab(editor)}
        onOpen={() => void openTab(editor)}
        onOpenPath={(p) => void window.api.openRecent(p).then((res) => openTab(editor, res))}
        onSave={() => void saveActive()}
        onSaveAs={() => void saveDocumentAs(editor)}
        onExportWord={() => void exportWordDocument(editor)}
        onExportPdf={() => void exportPdfDocument(editor)}
        onPrint={() => void printCurrentDocument(editor)}
      />
      <TabBar
        onSelect={(id) => activateTab(editor, id)}
        onClose={(id) => closeTab(editor, id)}
        onNew={() => newTab(editor)}
      />
      <Toolbar
        editor={editor}
        themeOpen={themeOpen}
        onToggleTheme={() => setThemeOpen((v) => !v)}
        onFind={() => setShowFind(true)}
      />
      <TableContextMenu editor={editor} />
      <ImageMenu editor={editor} />
      <div className={`app-body ${themeOpen ? 'theme-open' : ''}`}>
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
        {themeOpen && <ThemePanel onClose={() => setThemeOpen(false)} />}
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
