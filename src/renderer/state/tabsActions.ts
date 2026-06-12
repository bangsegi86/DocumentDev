import type { Editor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import type { DocFile, Lang, ThemeSettings } from '@shared/types'
import { extractPayload } from '@shared/fileFormat'
import { useDocumentStore } from './documentStore'
import { useTabsStore, type TabRecord } from './tabsStore'
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
    doc: null
  }
}

/** Copy the live active document (documentStore + editor content) into its tab record. */
export function snapshotActive(editor: Editor): void {
  const ds = useDocumentStore.getState()
  const { activeId } = useTabsStore.getState()
  if (!activeId) return
  useTabsStore.getState().update(activeId, {
    filePath: ds.filePath,
    title: ds.title,
    theme: ds.theme,
    dirty: ds.dirty,
    doc: editor.getJSON()
  })
}

function loadRecord(editor: Editor, rec: TabRecord): void {
  const lang = useDocumentStore.getState().lang
  useDocumentStore.getState().loadDocument({
    filePath: rec.filePath,
    title: rec.title,
    lang,
    theme: rec.theme,
    doc: rec.doc
  })
  editor.commands.setContent(rec.doc ?? '', false)
  if (rec.dirty) useDocumentStore.getState().markDirty()
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
    doc: editor.getJSON()
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
export async function openTab(editor: Editor): Promise<void> {
  const res = await window.api.openFile()
  if (res.canceled || !res.contents) return
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
    doc: payload.tiptapDoc
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

  void window.api.recoveryDelete(id)
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

/** Write recovery snapshots for every dirty tab; drop them for clean ones. */
export function autosaveRecovery(editor: Editor): void {
  snapshotActive(editor)
  const lang = useDocumentStore.getState().lang
  for (const t of useTabsStore.getState().tabs) {
    if (t.dirty) {
      const payload: RecoveryDoc = {
        id: t.id,
        filePath: t.filePath,
        title: t.title,
        lang,
        theme: t.theme,
        tiptapDoc: t.doc,
        savedAt: Date.now()
      }
      void window.api.recoveryWrite(t.id, JSON.stringify(payload))
    } else {
      void window.api.recoveryDelete(t.id)
    }
  }
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
        tiptapDoc: tab.doc ?? { type: 'doc', content: [{ type: 'paragraph' }] }
      }
      const res = await window.api.saveFile(tab.filePath, exportHtml(docFile))
      if (res.canceled) return false
      useTabsStore.getState().update(tab.id, { dirty: false })
      if (tab.id === activeId) useDocumentStore.getState().markClean()
      void window.api.recoveryDelete(tab.id)
    } else {
      activateTab(editor, tab.id)
      const saved = await saveDocumentAs(editor)
      if (!saved) return false
      void window.api.recoveryDelete(tab.id)
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
    doc: d.tiptapDoc
  }))
  useTabsStore.getState().setAll(tabs, tabs[0].id)
  loadRecord(editor, tabs[0])
}
