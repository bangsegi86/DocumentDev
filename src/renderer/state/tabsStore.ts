import { create } from 'zustand'
import type { JSONContent } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'
import type { ThemeSettings } from '@shared/types'

/** One open document tab. For the ACTIVE tab the live truth is `documentStore`
 *  + the editor content; this record is refreshed via `snapshotActive()`. */
export interface TabRecord {
  id: string
  filePath: string | null
  title: string
  theme: ThemeSettings
  dirty: boolean
  /** Initial content for a tab that has never been shown (new/opened/recovered).
   *  Once the tab has been visited, `state` is the source of truth instead. */
  doc: JSONContent | null
  /** The tab's full ProseMirror state (content + its OWN undo history +
   *  selection), saved when switching away and restored when switching back. */
  state: EditorState | null
  /** Scroll offset of the content pane, restored on switch-back. */
  scrollTop: number
}

/** The tab's current content as JSON (for saving / recovery snapshots). */
export function tabDocJSON(rec: TabRecord): JSONContent | null {
  return rec.state ? (rec.state.doc.toJSON() as JSONContent) : rec.doc
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
