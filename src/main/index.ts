import { app, BrowserWindow, ipcMain } from 'electron'
import { createWindow } from './window'
import { registerFileHandlers } from './ipc/fileHandlers'
import { registerRecoveryHandlers } from './ipc/recoveryHandlers'
import { buildMenu, setMenuLang } from './menu'
import { documentArgs, onRecentChange } from './docFiles'
import { openInApp, registerOpenQueue } from './openQueue'
import { IPC, type Lang } from '../shared/types'

// One app instance: opening a document while the app is running ("Open with",
// drag onto the shortcut) hands it to the running window as a new tab.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    documentArgs(argv).forEach(openInApp)
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  // macOS delivers "open with" / dock drops through this event.
  app.on('open-file', (event, path) => {
    event.preventDefault()
    openInApp(path)
  })

  app.whenReady().then(() => {
    registerFileHandlers()
    registerRecoveryHandlers()
    registerOpenQueue()
    void buildMenu()
    onRecentChange(() => void buildMenu())

    // The renderer tells the main process which language to render the native menu in.
    ipcMain.on(IPC.setMenuLang, (_event, lang: Lang) => setMenuLang(lang))

    createWindow()
    documentArgs(process.argv).forEach(openInApp)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
