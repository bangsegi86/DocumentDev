import type { Editor } from '@tiptap/react'
import type { DocFile } from '@shared/types'
import { FILE_EXTENSION } from '@shared/constants'
import { useDocumentStore } from './documentStore'
import { exportHtml } from '../export/exportHtml'
import { exportWord } from '../export/exportWord'
import { ko } from '../i18n/ko'
import { en } from '../i18n/en'

/** The UI dictionary for the current language (for confirm/alert text). */
export function dict(): typeof ko {
  return useDocumentStore.getState().lang === 'ko' ? ko : (en as unknown as typeof ko)
}

/**
 * Write a document to `path`. If another program changed the file since it
 * was opened/saved, ask before overwriting. @returns true if written.
 */
export async function writeDocumentFile(path: string, html: string): Promise<boolean> {
  let res = await window.api.saveFile(path, html)
  if (res.conflict) {
    if (!window.confirm(dict().fileChangedOnDisk)) return false
    res = await window.api.saveFile(path, html, true)
  }
  return !res.canceled
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

/** @returns true if the document was written, false if the user cancelled. */
export async function saveDocument(editor: Editor): Promise<boolean> {
  const { filePath } = useDocumentStore.getState()
  const html = exportHtml(currentDocFile(editor))
  if (!filePath) {
    return saveDocumentAs(editor)
  }
  if (await writeDocumentFile(filePath, html)) {
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

/** Save the document as an A4 PDF (same look as the exported page, laid out
 *  for paper by the document's print styles). */
export async function exportPdfDocument(editor: Editor): Promise<void> {
  try {
    const html = exportHtml(currentDocFile(editor))
    await window.api.exportPdf(`${safeBaseName()}.pdf`, html, useDocumentStore.getState().lang)
  } catch (e) {
    window.alert(`${dict().exportFailed}\n${e instanceof Error ? e.message : String(e)}`)
  }
}

/** Open the system print dialog for the document. */
export async function printCurrentDocument(editor: Editor): Promise<void> {
  try {
    await window.api.print(exportHtml(currentDocFile(editor)))
  } catch (e) {
    window.alert(`${dict().exportFailed}\n${e instanceof Error ? e.message : String(e)}`)
  }
}

export async function exportWordDocument(editor: Editor): Promise<void> {
  try {
    const doc = exportWord(currentDocFile(editor))
    await window.api.saveWord(`${safeBaseName()}.doc`, doc)
  } catch (e) {
    window.alert(`${dict().exportFailed}\n${e instanceof Error ? e.message : String(e)}`)
  }
}
