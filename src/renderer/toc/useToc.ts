import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { Transaction } from '@tiptap/pm/state'
import { deriveToc, type TocItem } from './toc'

/** Live list of headings derived from the editor, updated on every doc change. */
export function useToc(editor: Editor | null): TocItem[] {
  const [items, setItems] = useState<TocItem[]>([])

  useEffect(() => {
    if (!editor) return
    const refresh = (): void => setItems(deriveToc(editor.getJSON()))
    // Listen to 'transaction' (not 'update'): it fires for programmatic
    // setContent too (used by Open), so the TOC refreshes when a file is loaded.
    const onTransaction = ({ transaction }: { transaction: Transaction }): void => {
      if (transaction.docChanged) refresh()
    }
    refresh()
    editor.on('transaction', onTransaction)
    return () => {
      editor.off('transaction', onTransaction)
    }
  }, [editor])

  return items
}
