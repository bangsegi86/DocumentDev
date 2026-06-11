import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type DocApi, type Lang, type MenuAction } from '../shared/types'

const api: DocApi = {
  openFile: () => ipcRenderer.invoke(IPC.fileOpen),
  saveFile: (path, contents) => ipcRenderer.invoke(IPC.fileSave, path, contents),
  saveFileAs: (suggestedName, contents) =>
    ipcRenderer.invoke(IPC.fileSaveAs, suggestedName, contents),
  saveWord: (suggestedName, contents) =>
    ipcRenderer.invoke(IPC.fileSaveWord, suggestedName, contents),
  openImage: () => ipcRenderer.invoke(IPC.imageOpen),
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
  saveForCloseResult: (saved: boolean) => ipcRenderer.send(IPC.saveForCloseResult, saved)
}

contextBridge.exposeInMainWorld('api', api)
