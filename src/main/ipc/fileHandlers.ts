import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/types'
import {
  openFileDialog,
  saveFile,
  saveFileAsDialog,
  saveWordDialog,
  openImageDialog
} from './dialogs'
import { getRecent, readDocument, clearRecent } from '../docFiles'

export function registerFileHandlers(): void {
  ipcMain.handle(IPC.fileOpen, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return openFileDialog(win)
  })

  ipcMain.handle(IPC.fileSave, (_event, path: string, contents: string, force?: boolean) => {
    return saveFile(path, contents, force === true)
  })

  ipcMain.handle(IPC.recentList, () => getRecent())
  ipcMain.handle(IPC.recentOpen, (_event, path: string) => readDocument(path))
  ipcMain.handle(IPC.recentClear, () => clearRecent())

  ipcMain.handle(IPC.fileSaveAs, (event, suggestedName: string, contents: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return saveFileAsDialog(win, suggestedName, contents)
  })

  ipcMain.handle(IPC.fileSaveWord, (event, suggestedName: string, contents: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return saveWordDialog(win, suggestedName, contents)
  })

  ipcMain.handle(IPC.imageOpen, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return openImageDialog(win)
  })
}
