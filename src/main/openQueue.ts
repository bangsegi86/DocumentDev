import { BrowserWindow, ipcMain } from 'electron'
import { IPC } from '../shared/types'
import { readDocument } from './docFiles'

// Documents the OS (or the native "recent" menu) asks us to open. They are
// queued until the renderer reports that its editor is ready, then delivered.

const pending: string[] = []
let ready = false

function mainWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

async function deliver(path: string): Promise<void> {
  const win = mainWindow()
  if (!win) return
  const res = await readDocument(path)
  win.webContents.send(IPC.openFromOS, res)
  if (win.isMinimized()) win.restore()
  win.focus()
}

/** Open a document in the app window (queued until the editor is ready). */
export function openInApp(path: string): void {
  if (ready && mainWindow()) void deliver(path)
  else pending.push(path)
}

export function registerOpenQueue(): void {
  ipcMain.on(IPC.rendererReady, () => {
    ready = true
    for (const p of pending.splice(0)) void deliver(p)
  })
}

/** A new window starts with an editor that isn't mounted yet. */
export function markRendererNotReady(): void {
  ready = false
}
