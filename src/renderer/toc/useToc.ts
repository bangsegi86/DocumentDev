import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { deriveToc, type TocItem } from './toc'

/** Live list of headings derived from the editor, updated on every doc change. */
export function useToc(editor: Editor | null): TocItem[] {
  const [items, setItems] = useState<TocItem[]>([])

  useEffect(() => {
    if (!editor) return
    const update = (): void => setItems(deriveToc(editor.getJSON()))
    update()
    editor.on('update', update)
    return () => {
      editor.off('update', update)
    }
  }, [editor])

  return items
}
