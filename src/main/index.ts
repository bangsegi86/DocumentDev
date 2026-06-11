import { app, BrowserWindow, ipcMain } from 'electron'
import { createWindow } from './window'
import { registerFileHandlers } from './ipc/fileHandlers'
import { registerRecoveryHandlers } from './ipc/recoveryHandlers'
import { buildMenu } from './menu'
import { IPC, type Lang } from '../shared/types'

app.whenReady().then(() => {
  registerFileHandlers()
  registerRecoveryHandlers()
  buildMenu('ko')

  // The renderer tells the main process which language to render the native menu in.
  ipcMain.on(IPC.setMenuLang, (_event, lang: Lang) => buildMenu(lang))

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
