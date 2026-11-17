import type { Editor } from '@tiptap/react'
import { createDocument, type JSONContent } from '@tiptap/core'
import { EditorState } from '@tiptap/pm/state'
import type { DocFile, Lang, ThemeSettings } from '@shared/types'
import { extractPayload } from '@shared/fileFormat'
import { useDocumentStore } from './documentStore'
import { useTabsStore, tabDocJSON, type TabRecord } from './tabsStore'
import { saveDocumentAs } from './fileActions'
import { exportHtml } from '../export/exportHtml'
import { defaultTheme } from '../theme/defaultTheme'
import { ko } from '../i18n/ko'
import { en } from '../i18n/en'

let idSeq = 0
function genId(): string {
  idSeq += 1
  return `tab-${Date.now()}-${idSeq}`
}

function emptyTab(): TabRecord {
  return {
    id: genId(),
    filePath: null,
    title: defaultTheme.titleText,
    theme: { ...defaultTheme },
    dirty: false,
    doc: null,
    state: null,
    scrollTop: 0
  }
}

/** Transaction meta flag telling listeners (e.g. the TOC) that the whole
 *  editor state was swapped for another tab's. */
export const TAB_SWITCH_META = 'docdevTabSwitch'

function contentPane(): HTMLElement | null {
  return document.querySelector('.doc-content')
}

/** Save the live active document (documentStore + the editor's whole state,
 *  including its undo history) into its tab record. No serialization. */
export function snapshotActive(editor: Editor): void {
  const ds = useDocumentStore.getState()
  const { activeId } = useTabsStore.getState()
  if (!activeId) return
  useTabsStore.getState().update(activeId, {
    filePath: ds.filePath,
    title: ds.title,
    theme: ds.theme,
    dirty: ds.dirty,
    state: editor.state,
    scrollTop: contentPane()?.scrollTop ?? 0
  })
}

/** The record's saved editor state, or a fresh one (with an empty undo
 *  history) built from its initial content. */
function stateFor(editor: Editor, rec: TabRecord): EditorState {
  if (rec.state) return rec.state
  const doc = createDocument(rec.doc ?? '', editor.schema)
  return EditorState.create({ schema: editor.schema, doc, plugins: editor.state.plugins })
}

/**
 * Show a tab in the editor by swapping in its own EditorState. Unlike
 * setContent this does not create an undoable step, so Ctrl+Z can never pull
 * another tab's content into this one, and each tab keeps its own history.
 */
function loadRecord(editor: Editor, rec: TabRecord): void {
  const lang = useDocumentStore.getState().lang
  useDocumentStore.getState().loadDocument({
    filePath: rec.filePath,
    title: rec.title,
    lang,
    theme: rec.theme
  })
  editor.view.updateState(stateFor(editor, rec))
  // updateState emits no editor events; dispatch an empty, non-undoable
  // transaction so toolbar / TOC / menus refresh for the new content.
  editor.view.dispatch(
    editor.state.tr
      .setMeta('addToHistory', false)
      .setMeta('preventUpdate', true)
      .setMeta(TAB_SWITCH_META, true)
  )
  if (rec.dirty) useDocumentStore.getState().markDirty()
  const top = rec.scrollTop
  requestAnimationFrame(() => {
    const pane = contentPane()
    if (pane) pane.scrollTop = top
  })
}

/** Seed the very first tab from whatever is currently in documentStore/editor. */
export function initTabs(editor: Editor): void {
  if (useTabsStore.getState().tabs.length > 0) return
  const ds = useDocumentStore.getState()
  const rec: TabRecord = {
    id: genId(),
    filePath: ds.filePath,
    title: ds.title,
    theme: ds.theme,
    dirty: ds.dirty,
    doc: null,
    state: editor.state,
    scrollTop: 0
  }
  useTabsStore.getState().setAll([rec], rec.id)
}

export function activateTab(editor: Editor, id: string): void {
  if (id === useTabsStore.getState().activeId) return
  snapshotActive(editor)
  const rec = useTabsStore.getState().tabs.find((t) => t.id === id)
  if (!rec) return
  useTabsStore.getState().setActive(id)
  loadRecord(editor, rec)
}

export function newTab(editor: Editor): void {
  snapshotActive(editor)
  const rec = emptyTab()
  useTabsStore.getState().addTab(rec)
  loadRecord(editor, rec)
}

/** Open a file. Reuses the active tab if it's a pristine, empty "Untitled". */
export async function openTab(
  editor: Editor,
  given?: { path: string | null; contents: string }
): Promise<void> {
  const res = given ? { canceled: false, ...given } : await window.api.openFile()
  if (res.canceled || !res.contents) return
  // Already open? Just switch to that tab instead of opening a duplicate.
  const { tabs, activeId } = useTabsStore.getState()
  const livePath = useDocumentStore.getState().filePath
  const existing =
    res.path && tabs.find((t) => (t.id === activeId ? livePath : t.filePath) === res.path)
  if (existing) {
    activateTab(editor, existing.id)
    return
  }
  const payload = extractPayload(res.contents)
  if (!payload) {
    window.alert('This file was not created by DocumentDev (no editable data found).')
    return
  }
  const ds = useDocumentStore.getState()
  const reuseActive = !ds.filePath && !ds.dirty && editor.isEmpty
  const rec: TabRecord = {
    id: reuseActive ? useTabsStore.getState().activeId : genId(),
    filePath: res.path ?? null,
    title: payload.title,
    theme: { ...defaultTheme, ...payload.theme },
    dirty: false,
    doc: payload.tiptapDoc,
    state: null,
    scrollTop: 0
  }
  if (reuseActive) {
    useTabsStore.getState().update(rec.id, rec)
  } else {
    snapshotActive(editor)
    useTabsStore.getState().addTab(rec)
  }
  loadRecord(editor, rec)
}

function confirmDiscard(): boolean {
  const { lang } = useDocumentStore.getState()
  const dict = lang === 'ko' ? ko : en
  return window.confirm(`${dict.unsavedTitle}\n\n${dict.unsavedMessage}`)
}

export function closeTab(editor: Editor, id: string): void {
  const { tabs, activeId } = useTabsStore.getState()
  const rec = tabs.find((t) => t.id === id)
  if (!rec) return
  const isDirty = id === activeId ? useDocumentStore.getState().dirty : rec.dirty
  if (isDirty && !confirmDiscard()) return

  dropRecovery(id)
  const idx = tabs.findIndex((t) => t.id === id)
  const remaining = tabs.filter((t) => t.id !== id)

  if (remaining.length === 0) {
    const fresh = emptyTab()
    useTabsStore.getState().setAll([fresh], fresh.id)
    loadRecord(editor, fresh)
    return
  }
  if (id !== activeId) {
    useTabsStore.getState().setAll(remaining, activeId)
    return
  }
  const next = remaining[Math.min(idx, remaining.length - 1)]
  useTabsStore.getState().setAll(remaining, next.id)
  loadRecord(editor, next)
}

// ---- Crash-recovery autosave ----

interface RecoveryDoc {
  id: string
  filePath: string | null
  title: string
  lang: Lang
  theme: ThemeSettings
  tiptapDoc: JSONContent | null
  savedAt: number
}

/** Last thing written to (or removed from) the recovery store, per tab. Compared
 *  by reference: ProseMirror docs and theme objects are immutable, so an
 *  unchanged reference means "nothing new to write". */
const recoveryWritten = new Map<string, { doc: unknown; theme: unknown; title: string } | 'clean'>()
let lastEditAt = 0

/** Record that the user just edited (autosave waits for a short idle gap). */
export function noteEdit(): void {
  lastEditAt = Date.now()
}

/**
 * Write recovery snapshots for dirty tabs that changed since their last write,
 * and drop them (once) for tabs that became clean. Skips while the user is
 * actively typing so serializing a large doc never lands mid-keystroke.
 * Does not touch the tabs store, so it never re-renders the UI.
 */
export function autosaveRecovery(editor: Editor, idleMs = 1500): void {
  if (Date.now() - lastEditAt < idleMs) return
  const ds = useDocumentStore.getState()
  const { tabs, activeId } = useTabsStore.getState()
  for (const t of tabs) {
    const isActive = t.id === activeId
    const dirty = isActive ? ds.dirty : t.dirty
    const prev = recoveryWritten.get(t.id)
    if (!dirty) {
      if (prev !== 'clean') {
        void window.api.recoveryDelete(t.id)
        recoveryWritten.set(t.id, 'clean')
      }
      continue
    }
    const sig = isActive
      ? { doc: editor.state.doc, theme: ds.theme, title: ds.title }
      : { doc: t.state?.doc ?? t.doc, theme: t.theme, title: t.title }
    if (prev && prev !== 'clean' && prev.doc === sig.doc && prev.theme === sig.theme && prev.title === sig.title) {
      continue
    }
    const payload: RecoveryDoc = {
      id: t.id,
      filePath: isActive ? ds.filePath : t.filePath,
      title: sig.title,
      lang: ds.lang,
      theme: sig.theme,
      tiptapDoc: isActive ? editor.getJSON() : tabDocJSON(t),
      savedAt: Date.now()
    }
    void window.api.recoveryWrite(t.id, JSON.stringify(payload))
    recoveryWritten.set(t.id, sig)
  }
}

/** Forget a tab's recovery snapshot (after it was saved or closed). */
export function dropRecovery(id: string): void {
  void window.api.recoveryDelete(id)
  recoveryWritten.set(id, 'clean')
}

/** True if any tab (active included) has unsaved changes. */
export function anyTabDirty(): boolean {
  if (useDocumentStore.getState().dirty) return true
  const { tabs, activeId } = useTabsStore.getState()
  return tabs.some((t) => t.id !== activeId && t.dirty)
}

/**
 * Save every dirty tab. Tabs with a file path are written silently from their
 * snapshot; unsaved ("Untitled") tabs are activated so the user gets a Save As
 * dialog. Returns false if the user cancels any save.
 */
export async function saveAllTabs(editor: Editor): Promise<boolean> {
  snapshotActive(editor)
  const lang = useDocumentStore.getState().lang
  for (const tab of [...useTabsStore.getState().tabs]) {
    const activeId = useTabsStore.getState().activeId
    const isDirty = tab.id === activeId ? useDocumentStore.getState().dirty : tab.dirty
    if (!isDirty) continue

    if (tab.filePath) {
      const docFile: DocFile = {
        version: 1,
        title: tab.title,
        lang,
        theme: tab.theme,
        tiptapDoc: tabDocJSON(tab) ?? { type: 'doc', content: [{ type: 'paragraph' }] }
      }
      const res = await window.api.saveFile(tab.filePath, exportHtml(docFile))
      if (res.canceled) return false
      useTabsStore.getState().update(tab.id, { dirty: false })
      if (tab.id === activeId) useDocumentStore.getState().markClean()
      dropRecovery(tab.id)
    } else {
      activateTab(editor, tab.id)
      const saved = await saveDocumentAs(editor)
      if (!saved) return false
      dropRecovery(tab.id)
      snapshotActive(editor)
    }
  }
  return true
}

/** On startup: if recovery snapshots exist, optionally restore them as tabs. */
export async function maybeRestoreRecovery(editor: Editor): Promise<void> {
  const raw = await window.api.recoveryList()
  if (raw.length === 0) return
  const dict = useDocumentStore.getState().lang === 'ko' ? ko : en
  const docs = raw
    .map((s) => {
      try {
        return JSON.parse(s) as RecoveryDoc
      } catch {
        return null
      }
    })
    .filter((d): d is RecoveryDoc => !!d)
  if (docs.length === 0) {
    await window.api.recoveryClear()
    return
  }
  if (!window.confirm(`${dict.recoverTitle}\n\n${dict.recoverMessage}`)) {
    await window.api.recoveryClear()
    return
  }
  const tabs: TabRecord[] = docs.map((d) => ({
    id: d.id,
    filePath: d.filePath,
    title: d.title,
    theme: { ...defaultTheme, ...d.theme },
    dirty: true,
    doc: d.tiptapDoc,
    state: null,
    scrollTop: 0
  }))
  useTabsStore.getState().setAll(tabs, tabs[0].id)
  loadRecord(editor, tabs[0])
}
