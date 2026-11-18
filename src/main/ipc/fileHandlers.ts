import { ipcMain, BrowserWindow } from 'electron'
import { IPC, type Lang } from '../../shared/types'
import { exportPdf, printDocument } from '../printing'
import {
  openFileDialog,
  saveFile,
  saveFileAsDialog,
  saveWordDialog,
  openImageDialog
} from './dialogs'
import { getRecent, readDocument, clearRecent, isAllowedPath } from '../docFiles'

export function registerFileHandlers(): void {
  ipcMain.handle(IPC.fileOpen, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return openFileDialog(win)
  })

  // Only paths the user chose may be written (see docFiles allowPath).
  ipcMain.handle(IPC.fileSave, (_event, path: string, contents: string, force?: boolean) => {
    if (typeof path !== 'string' || !isAllowedPath(path)) return { canceled: true, error: 'ENOTALLOWED' }
    return saveFile(path, contents, force === true)
  })

  ipcMain.handle(IPC.fileExportPdf, (event, suggestedName: string, html: string, lang: Lang) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return exportPdf(win, suggestedName, html, lang)
  })
  ipcMain.handle(IPC.filePrint, (_event, html: string) => printDocument(html))

  // Reached only through preload's openDroppedFile (path taken from a real
  // dropped File). Documents only.
  ipcMain.handle(IPC.openDropped, (_event, path: string) => {
    if (typeof path !== 'string' || !/\.html?$/i.test(path)) return { canceled: false, path, error: 'ENOTALLOWED' }
    return readDocument(path)
  })

  ipcMain.handle(IPC.recentList, () => getRecent())
  ipcMain.handle(IPC.recentOpen, async (_event, path: string) => {
    const recent = await getRecent()
    if (typeof path !== 'string' || !recent.includes(path)) return { canceled: false, path, error: 'ENOTALLOWED' }
    return readDocument(path)
  })
  ipcMain.handle(IPC.recentClear, () => clearRecent())

  ipcMain.handle(IPC.fileSaveAs, (event, suggestedName: string, contents: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return saveFileAsDialog(win, suggestedName, contents)
  })

  ipcMain.handle(IPC.fileSaveWord, (event, suggestedName: string, contents: Uint8Array) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return saveWordDialog(win, suggestedName, contents)
  })

  ipcMain.handle(IPC.imageOpen, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return openImageDialog(win)
  })
}
