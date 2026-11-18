import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IPC, type DocApi, type Lang, type MenuAction, type OpenResult } from '../shared/types'

const api: DocApi = {
  openFile: () => ipcRenderer.invoke(IPC.fileOpen),
  saveFile: (path, contents, force) => ipcRenderer.invoke(IPC.fileSave, path, contents, force),
  saveFileAs: (suggestedName, contents) =>
    ipcRenderer.invoke(IPC.fileSaveAs, suggestedName, contents),
  saveWord: (suggestedName, contents) =>
    ipcRenderer.invoke(IPC.fileSaveWord, suggestedName, contents),
  exportPdf: (suggestedName, html, lang) => ipcRenderer.invoke(IPC.fileExportPdf, suggestedName, html, lang),
  print: (html) => ipcRenderer.invoke(IPC.filePrint, html),
  openImage: () => ipcRenderer.invoke(IPC.imageOpen),
  // The path comes from the dropped File itself (webUtils), never from page
  // script, so a page can't make the main process read or allow any path.
  openDroppedFile: async (file: File) => {
    const path = webUtils.getPathForFile(file)
    if (!path) return { canceled: false, error: 'NOPATH' }
    return ipcRenderer.invoke(IPC.openDropped, path)
  },
  setMenuLang: (lang: Lang) => ipcRenderer.send(IPC.setMenuLang, lang),
  onMenuAction: (handler) => {
    const listener = (_e: unknown, action: MenuAction): void => handler(action)
    ipcRenderer.on(IPC.menuAction, listener)
    return () => ipcRenderer.removeListener(IPC.menuAction, listener)
  },
  setDirty: (dirty: boolean) => ipcRenderer.send(IPC.docDirty, dirty),
  onSaveForClose: (handler) => {
    const listener = (): void => handler()
    ipcRenderer.on(IPC.saveForClose, listener)
    return () => ipcRenderer.removeListener(IPC.saveForClose, listener)
  },
  saveForCloseResult: (saved: boolean) => ipcRenderer.send(IPC.saveForCloseResult, saved),
  recoveryWrite: (id: string, json: string) => ipcRenderer.invoke(IPC.recoveryWrite, id, json),
  recoveryDelete: (id: string) => ipcRenderer.invoke(IPC.recoveryDelete, id),
  recoveryList: () => ipcRenderer.invoke(IPC.recoveryList),
  recoveryClear: () => ipcRenderer.invoke(IPC.recoveryClear),
  recentList: () => ipcRenderer.invoke(IPC.recentList),
  openRecent: (path: string) => ipcRenderer.invoke(IPC.recentOpen, path),
  clearRecent: () => ipcRenderer.invoke(IPC.recentClear),
  onOpenFromOS: (handler) => {
    const listener = (_e: unknown, res: OpenResult): void => handler(res)
    ipcRenderer.on(IPC.openFromOS, listener)
    return () => ipcRenderer.removeListener(IPC.openFromOS, listener)
  },
  rendererReady: () => ipcRenderer.send(IPC.rendererReady)
}

contextBridge.exposeInMainWorld('api', api)
