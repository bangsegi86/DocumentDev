import type { Editor } from '@tiptap/react'
import type { DocFile } from '@shared/types'
import { FILE_EXTENSION } from '@shared/constants'
import { useDocumentStore } from './documentStore'
import { exportHtml } from '../export/exportHtml'
import { exportWord } from '../export/exportWord'

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

/** @returns true if the document was written, false if the user cancelled. */
export async function saveDocument(editor: Editor): Promise<boolean> {
  const { filePath } = useDocumentStore.getState()
  const html = exportHtml(currentDocFile(editor))
  if (!filePath) {
    return saveDocumentAs(editor)
  }
  const res = await window.api.saveFile(filePath, html)
  if (!res.canceled) {
    useDocumentStore.getState().markClean()
    return true
  }
  return false
}

/** @returns true if the document was written, false if the user cancelled. */
export async function saveDocumentAs(editor: Editor): Promise<boolean> {
  const html = exportHtml(currentDocFile(editor))
  const res = await window.api.saveFileAs(suggestedFileName(), html)
  if (!res.canceled && res.path) {
    useDocumentStore.getState().setFilePath(res.path)
    useDocumentStore.getState().markClean()
    return true
  }
  return false
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
