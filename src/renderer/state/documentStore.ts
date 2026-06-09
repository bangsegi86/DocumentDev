import { create } from 'zustand'
import type { JSONContent } from '@tiptap/core'
import type { Lang, ThemeSettings } from '@shared/types'
import { defaultTheme } from '../theme/defaultTheme'

interface DocumentState {
  filePath: string | null
  title: string
  lang: Lang
  theme: ThemeSettings
  dirty: boolean
  /** Bumped to ask the editor to replace its content with `pendingDoc`. */
  loadToken: number
  pendingDoc: JSONContent | null

  setTitle: (title: string) => void
  setLang: (lang: Lang) => void
  setTheme: (patch: Partial<ThemeSettings>) => void
  resetTheme: () => void
  markDirty: () => void
  markClean: () => void
  setFilePath: (path: string | null) => void
  /** Replace the whole document (used by New / Open). */
  loadDocument: (input: {
    filePath: string | null
    title: string
    lang: Lang
    theme: ThemeSettings
    doc: JSONContent | null
  }) => void
}

export const useDocumentStore = create<DocumentState>((set) => ({
  filePath: null,
  title: defaultTheme.titleText,
  lang: 'ko',
  theme: defaultTheme,
  dirty: false,
  loadToken: 0,
  pendingDoc: null,

  setTitle: (title) =>
    set((s) => ({ title, theme: { ...s.theme, titleText: title }, dirty: true })),
  setLang: (lang) => set({ lang }),
  setTheme: (patch) => set((s) => ({ theme: { ...s.theme, ...patch }, dirty: true })),
  resetTheme: () => set((s) => ({ theme: { ...defaultTheme, titleText: s.title }, dirty: true })),
  markDirty: () => set((s) => (s.dirty ? s : { dirty: true })),
  markClean: () => set({ dirty: false }),
  setFilePath: (filePath) => set({ filePath }),
  loadDocument: ({ filePath, title, lang, theme, doc }) =>
    set((s) => ({
      filePath,
      title,
      lang,
      theme,
      dirty: false,
      pendingDoc: doc,
      loadToken: s.loadToken + 1
    }))
}))
