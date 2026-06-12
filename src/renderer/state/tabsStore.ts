import { create } from 'zustand'
import type { JSONContent } from '@tiptap/core'
import type { ThemeSettings } from '@shared/types'

/** One open document tab. For the ACTIVE tab the live truth is `documentStore`
 *  + the editor content; this record is refreshed via `snapshotActive()`. */
export interface TabRecord {
  id: string
  filePath: string | null
  title: string
  theme: ThemeSettings
  dirty: boolean
  /** Content snapshot (kept fresh for inactive tabs; refreshed on switch/save). */
  doc: JSONContent | null
}

interface TabsStore {
  tabs: TabRecord[]
  activeId: string
  setAll: (tabs: TabRecord[], activeId: string) => void
  addTab: (rec: TabRecord) => void
  update: (id: string, patch: Partial<TabRecord>) => void
  setActive: (id: string) => void
  moveTab: (fromId: string, toId: string) => void
}

export const useTabsStore = create<TabsStore>((set) => ({
  tabs: [],
  activeId: '',
  setAll: (tabs, activeId) => set({ tabs, activeId }),
  addTab: (rec) => set((s) => ({ tabs: [...s.tabs, rec], activeId: rec.id })),
  update: (id, patch) =>
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  setActive: (id) => set({ activeId: id }),
  moveTab: (fromId, toId) =>
    set((s) => {
      const from = s.tabs.findIndex((t) => t.id === fromId)
      const to = s.tabs.findIndex((t) => t.id === toId)
      if (from < 0 || to < 0 || from === to) return {}
      const next = [...s.tabs]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return { tabs: next }
    })
}))
