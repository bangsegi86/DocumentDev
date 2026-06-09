import type { Editor, Range } from '@tiptap/core'
import { useDocumentStore } from '../../state/documentStore'
import { ko } from '../../i18n/ko'
import { en } from '../../i18n/en'

export interface SlashCommandItem {
  key: string
  title: string
  icon: string
  /** Extra lowercase search terms used for filtering. */
  search: string[]
  run: (editor: Editor, range: Range) => void
}

/**
 * Build the slash-menu command list, localized to the current UI language.
 * Reads the language from the store (no React context needed inside the
 * ProseMirror suggestion plugin).
 */
export function getSlashCommands(query: string): SlashCommandItem[] {
  const dict = useDocumentStore.getState().lang === 'ko' ? ko : en

  const items: SlashCommandItem[] = [
    {
      key: 'paragraph',
      title: dict.paragraph,
      icon: '¶',
      search: ['text', 'paragraph', '본문'],
      run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run()
    },
    {
      key: 'h1',
      title: dict.h1,
      icon: 'H1',
      search: ['h1', 'heading', 'title', '주제', '제목'],
      run: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 1 }).run()
    },
    {
      key: 'h2',
      title: dict.h2,
      icon: 'H2',
      search: ['h2', 'heading', '부제'],
      run: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 2 }).run()
    },
    {
      key: 'h3',
      title: dict.h3,
      icon: 'H3',
      search: ['h3', 'heading', '소제'],
      run: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 3 }).run()
    },
    {
      key: 'bulletList',
      title: dict.bulletList,
      icon: '•',
      search: ['bullet', 'list', 'ul', '목록'],
      run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run()
    },
    {
      key: 'orderedList',
      title: dict.orderedList,
      icon: '1.',
      search: ['ordered', 'number', 'list', 'ol', '번호'],
      run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run()
    },
    {
      key: 'codeBlock',
      title: dict.codeBlock,
      icon: '{ }',
      search: ['code', 'codeblock', 'pre', '코드'],
      run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run()
    },
    {
      key: 'table',
      title: dict.table,
      icon: '▦',
      search: ['table', 'grid', '표'],
      run: (e, r) =>
        e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
    {
      key: 'blockquote',
      title: dict.blockquote,
      icon: '❝',
      search: ['quote', 'blockquote', '인용'],
      run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run()
    },
    {
      key: 'horizontalRule',
      title: dict.horizontalRule,
      icon: '―',
      search: ['divider', 'hr', 'rule', '구분'],
      run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run()
    },
    {
      key: 'image',
      title: dict.image,
      icon: '🖼',
      search: ['image', 'picture', 'img', '이미지'],
      run: (e, r) => {
        const url = window.prompt(dict.imagePrompt)
        const chain = e.chain().focus().deleteRange(r)
        if (url) chain.setImage({ src: url }).run()
        else chain.run()
      }
    }
  ]

  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) || item.search.some((s) => s.includes(q))
  )
}
