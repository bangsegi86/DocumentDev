import { BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { APP_NAME } from '../shared/constants'
import { IPC, type Lang } from '../shared/types'
import { clearRecovery } from './ipc/recoveryHandlers'

// Tracked across the window's lifetime to guard against losing unsaved work.
let dirty = false
let dialogLang: Lang = 'ko'
let forceClose = false

ipcMain.on(IPC.docDirty, (_e, value: boolean) => {
  dirty = value
})
ipcMain.on(IPC.setMenuLang, (_e, lang: Lang) => {
  dialogLang = lang
})

export function createWindow(): BrowserWindow {
  // Fresh window starts clean; the renderer re-reports dirty state on mount.
  dirty = false
  forceClose = false

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: APP_NAME,
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())

  // Guard window close against unsaved changes (Save / Don't Save / Cancel).
  win.on('close', (e) => {
    if (forceClose || !dirty) return
    e.preventDefault()
    const ko = dialogLang === 'ko'
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      buttons: ko ? ['저장', '저장 안 함', '취소'] : ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
      title: ko ? '저장되지 않은 변경사항' : 'Unsaved changes',
      message: ko ? '변경사항을 저장하시겠습니까?' : 'Do you want to save your changes?',
      detail: ko
        ? '저장하지 않으면 변경사항이 사라집니다.'
        : "Your changes will be lost if you don't save them."
    })
    if (choice === 2) return // Cancel — stay open.
    if (choice === 1) {
      forceClose = true // Don't Save — discard recovery snapshots and close.
      void clearRecovery()
      win.destroy()
      return
    }
    // Save — ask the renderer to save, then close only if it succeeded.
    ipcMain.once(IPC.saveForCloseResult, (_e2, saved: boolean) => {
      if (saved) {
        forceClose = true
        win.destroy()
      }
    })
    win.webContents.send(IPC.saveForClose)
  })

  // Open external links in the system browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}
