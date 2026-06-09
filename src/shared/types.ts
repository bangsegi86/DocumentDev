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
  headingColor: string
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
  version: 1
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
}

/** Result of a save/saveAs operation. */
export interface SaveResult {
  canceled: boolean
  path?: string
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
  imageOpen: 'image:open',
  menuAction: 'menu:action',
  setMenuLang: 'menu:setLang'
} as const

/** Actions the native menu can dispatch into the renderer. */
export type MenuAction =
  | 'new'
  | 'open'
  | 'save'
  | 'saveAs'
  | 'exportWord'
  | 'find'
  | 'toggleTheme'
  | 'toggleSpellcheck'
  | 'toggleLang'

/** API surface exposed to the renderer via the preload contextBridge. */
export interface DocApi {
  openFile(): Promise<OpenResult>
  saveFile(path: string, contents: string): Promise<SaveResult>
  saveFileAs(suggestedName: string, contents: string): Promise<SaveResult>
  saveWord(suggestedName: string, contents: string): Promise<SaveResult>
  openImage(): Promise<ImageResult>
  setMenuLang(lang: Lang): void
  onMenuAction(handler: (action: MenuAction) => void): () => void
}
