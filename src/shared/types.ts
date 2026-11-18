import type { JSONContent } from '@tiptap/core'

export type Lang = 'ko' | 'en'

/** Per-document visual theme. Defaults mirror the Mushiny "RMS Interface Doc" look. */
export interface ThemeSettings {
  titleText: string
  /** Optional square logo/CI shown left of the title in the top bar (data URI). */
  logoDataUrl: string
  topBarColor: string
  topBarTextColor: string
  sidebarColor: string
  sidebarTextColor: string
  // Per-level heading styles (주제 / 부제 / 소제).
  h1Color: string
  h1Bold: boolean
  h1Italic: boolean
  h2Color: string
  h2Bold: boolean
  h2Italic: boolean
  h3Color: string
  h3Bold: boolean
  h3Italic: boolean
  linkColor: string
  tableBorderColor: string
  tableHeaderBackground: string
  codeBlockBackground: string
  breadcrumbColor: string
  bodyTextColor: string
  bodyFont: string
  bodyFontSize: string
}

/** The complete editable document, embedded inside the exported .html as JSON. */
export interface DocFile {
  /** 1 = self-contained payload; 2 = payload references images already in the
   *  visible HTML (written only when the doc has embedded images). In memory
   *  (after extractPayload) a document is always version 1. */
  version: 1 | 2
  title: string
  lang: Lang
  theme: ThemeSettings
  tiptapDoc: JSONContent
}

/** Result of opening a file from disk. */
export interface OpenResult {
  canceled: boolean
  path?: string
  contents?: string
  /** Set when the file could not be read (e.g. 'ENOENT' — moved or deleted). */
  error?: string
}

/** Result of a save/saveAs operation. */
export interface SaveResult {
  canceled: boolean
  path?: string
  /** The file was changed on disk by another program since it was opened or
   *  last saved; nothing was written. Retry with force to overwrite. */
  conflict?: boolean
  /** Set when nothing was written, e.g. 'ENOTALLOWED' for a path the user
   *  never chose in a dialog or opened. */
  error?: string
}

/** Result of picking an image file (returned as a base64 data URI). */
export interface ImageResult {
  canceled: boolean
  dataUri?: string
}

/** IPC channel names shared by main, preload and renderer. */
export const IPC = {
  fileOpen: 'file:open',
  fileSave: 'file:save',
  fileSaveAs: 'file:saveAs',
  fileSaveWord: 'file:saveWord',
  fileExportPdf: 'file:exportPdf',
  filePrint: 'file:print',
  imageOpen: 'image:open',
  menuAction: 'menu:action',
  setMenuLang: 'menu:setLang',
  // Unsaved-changes guard on window close.
  docDirty: 'doc:dirty',
  saveForClose: 'doc:saveForClose',
  saveForCloseResult: 'doc:saveForCloseResult',
  // Crash-recovery autosave store (in userData).
  recoveryWrite: 'recovery:write',
  recoveryDelete: 'recovery:delete',
  recoveryList: 'recovery:list',
  recoveryClear: 'recovery:clear',
  // Recent documents / documents opened by the OS ("Open with", menu).
  recentList: 'recent:list',
  recentOpen: 'recent:open',
  recentClear: 'recent:clear',
  openFromOS: 'file:openFromOS',
  openDropped: 'file:openDropped',
  rendererReady: 'app:rendererReady'
} as const

/** Actions the native menu can dispatch into the renderer. */
export type MenuAction =
  | 'new'
  | 'open'
  | 'save'
  | 'saveAs'
  | 'exportWord'
  | 'exportPdf'
  | 'print'
  | 'find'
  | 'toggleSpellcheck'
  | 'toggleLang'

/** API surface exposed to the renderer via the preload contextBridge. */
export interface DocApi {
  openFile(): Promise<OpenResult>
  saveFile(path: string, contents: string, force?: boolean): Promise<SaveResult>
  saveFileAs(suggestedName: string, contents: string): Promise<SaveResult>
  /** Save a .docx file (binary). */
  saveWord(suggestedName: string, contents: Uint8Array): Promise<SaveResult>
  /** Render the exported HTML to an A4 PDF (asks where to save). */
  exportPdf(suggestedName: string, html: string, lang: Lang): Promise<SaveResult>
  /** Open the system print dialog for the exported HTML. */
  print(html: string): Promise<boolean>
  openImage(): Promise<ImageResult>
  /**
   * Open a document file the user dropped on the window. The main process
   * reads it (so it can be saved back in place, like a file chosen in the
   * Open dialog). error 'NOPATH' = the item has no file on disk (e.g. from a
   * zip or mail attachment); the caller then reads it as an unsaved copy.
   */
  openDroppedFile(file: File): Promise<OpenResult>
  setMenuLang(lang: Lang): void
  onMenuAction(handler: (action: MenuAction) => void): () => void
  /** Tell the main process whether the document has unsaved changes. */
  setDirty(dirty: boolean): void
  /** Main asks the renderer to save before closing; reply via saveForCloseResult. */
  onSaveForClose(handler: () => void): () => void
  saveForCloseResult(saved: boolean): void
  /** Crash-recovery autosave: per-tab snapshots persisted in userData. */
  recoveryWrite(id: string, json: string): Promise<void>
  recoveryDelete(id: string): Promise<void>
  recoveryList(): Promise<string[]>
  recoveryClear(): Promise<void>
  /** Recent documents, newest first. */
  recentList(): Promise<string[]>
  openRecent(path: string): Promise<OpenResult>
  clearRecent(): Promise<void>
  /** Documents the OS / native menu asks to open (Open with, recent menu). */
  onOpenFromOS(handler: (res: OpenResult) => void): () => void
  /** Tell the main process the editor is ready to receive documents. */
  rendererReady(): void
}
