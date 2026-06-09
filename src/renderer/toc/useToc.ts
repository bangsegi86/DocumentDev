import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { Transaction } from '@tiptap/pm/state'
import { deriveTocFromDoc, tocEquals, type TocItem } from './toc'

/**
 * Live list of headings derived from the editor. To keep typing fast, the TOC
 * is recomputed by walking the ProseMirror doc (not editor.getJSON()), debounced
 * (~250ms), and only applied to state when it actually changed.
 */
export function useToc(editor: Editor | null): TocItem[] {
  const [items, setItems] = useState<TocItem[]>([])
  const itemsRef = useRef<TocItem[]>([])

  useEffect(() => {
    if (!editor) return
    let timer: ReturnType<typeof setTimeout> | undefined

    const recompute = (): void => {
      const next = deriveTocFromDoc(editor.state.doc)
      if (tocEquals(next, itemsRef.current)) return
      itemsRef.current = next
      setItems(next)
    }
    const schedule = (): void => {
      clearTimeout(timer)
      timer = setTimeout(recompute, 250)
    }
    const onTransaction = ({ transaction }: { transaction: Transaction }): void => {
      if (transaction.docChanged) schedule()
    }

    recompute()
    editor.on('transaction', onTransaction)
    return () => {
      clearTimeout(timer)
      editor.off('transaction', onTransaction)
    }
  }, [editor])

  return items
}
