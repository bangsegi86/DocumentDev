import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/types'
import { openFileDialog, saveFile, saveFileAsDialog, saveWordDialog } from './dialogs'

export function registerFileHandlers(): void {
  ipcMain.handle(IPC.fileOpen, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return openFileDialog(win)
  })

  ipcMain.handle(IPC.fileSave, (_event, path: string, contents: string) => {
    return saveFile(path, contents)
  })

  ipcMain.handle(IPC.fileSaveAs, (event, suggestedName: string, contents: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return saveFileAsDialog(win, suggestedName, contents)
  })

  ipcMain.handle(IPC.fileSaveWord, (event, suggestedName: string, contents: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return saveWordDialog(win, suggestedName, contents)
  })
}
