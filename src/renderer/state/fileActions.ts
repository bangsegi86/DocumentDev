import type { Editor } from '@tiptap/react'
import type { DocFile } from '@shared/types'
import { extractPayload } from '@shared/fileFormat'
import { FILE_EXTENSION } from '@shared/constants'
import { useDocumentStore } from './documentStore'
import { defaultTheme } from '../theme/defaultTheme'
import { exportHtml } from '../export/exportHtml'
import { exportWord } from '../export/exportWord'
import { ko } from '../i18n/ko'
import { en } from '../i18n/en'

function confirmDiscard(): boolean {
  const { dirty, lang } = useDocumentStore.getState()
  if (!dirty) return true
  const dict = lang === 'ko' ? ko : en
  return window.confirm(`${dict.unsavedTitle}\n\n${dict.unsavedMessage}`)
}

function currentDocFile(editor: Editor): DocFile {
  const { title, lang, theme } = useDocumentStore.getState()
  return { version: 1, title, lang, theme, tiptapDoc: editor.getJSON() }
}

function safeBaseName(): string {
  const { title } = useDocumentStore.getState()
  return (title || 'document').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'document'
}

function suggestedFileName(): string {
  return `${safeBaseName()}.${FILE_EXTENSION}`
}

export function newDocument(editor: Editor): void {
  if (!confirmDiscard()) return
  useDocumentStore.getState().loadDocument({
    filePath: null,
    title: defaultTheme.titleText,
    lang: useDocumentStore.getState().lang,
    theme: { ...defaultTheme },
    doc: null
  })
  editor.commands.clearContent(true)
}

export async function openDocument(editor: Editor): Promise<void> {
  if (!confirmDiscard()) return
  const res = await window.api.openFile()
  if (res.canceled || !res.contents) return

  const payload = extractPayload(res.contents)
  if (!payload) {
    window.alert('This file was not created by DocumentDev (no editable data found).')
    return
  }

  useDocumentStore.getState().loadDocument({
    filePath: res.path ?? null,
    title: payload.title,
    lang: payload.lang,
    theme: { ...defaultTheme, ...payload.theme },
    doc: payload.tiptapDoc
  })
  editor.commands.setContent(payload.tiptapDoc, false)
}

export async function saveDocument(editor: Editor): Promise<void> {
  const { filePath } = useDocumentStore.getState()
  const html = exportHtml(currentDocFile(editor))
  if (!filePath) {
    await saveDocumentAs(editor)
    return
  }
  const res = await window.api.saveFile(filePath, html)
  if (!res.canceled) useDocumentStore.getState().markClean()
}

export async function saveDocumentAs(editor: Editor): Promise<void> {
  const html = exportHtml(currentDocFile(editor))
  const res = await window.api.saveFileAs(suggestedFileName(), html)
  if (!res.canceled && res.path) {
    useDocumentStore.getState().setFilePath(res.path)
    useDocumentStore.getState().markClean()
  }
}

export async function exportWordDocument(editor: Editor): Promise<void> {
  try {
    if (typeof window.api?.saveWord !== 'function') {
      window.alert(
        'Word export is unavailable in this running instance.\nPlease restart the app (stop and re-run "npm run dev").'
      )
      return
    }
    const doc = exportWord(currentDocFile(editor))
    await window.api.saveWord(`${safeBaseName()}.doc`, doc)
  } catch (e) {
    window.alert('Word export failed: ' + (e instanceof Error ? e.message : String(e)))
  }
}
