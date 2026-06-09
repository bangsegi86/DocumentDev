import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextStyle from '@tiptap/extension-text-style'
import type { Extensions } from '@tiptap/core'
import { HeadingWithId } from './HeadingWithId'
import { SlashMenu } from './SlashMenu'
import { SearchReplace } from './SearchReplace'
import { TableCellBg, TableHeaderBg } from './TableCellBg'
import { TextColor } from './TextColor'
import { lowlight } from '../../lib/lowlight'

interface BuildOptions {
  /** Placeholder is editor-only; omit it when serializing for export. */
  placeholder?: string
  forExport?: boolean
}

/**
 * Single source of truth for the editor schema. The SAME extension list must be
 * used by the live editor and by `generateHTML` on export, otherwise the
 * round-trip (re-opening an exported file) breaks.
 */
export function buildExtensions(options: BuildOptions = {}): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      heading: false, // replaced by HeadingWithId below
      codeBlock: false // replaced by CodeBlockLowlight below
    }),
    HeadingWithId.configure({ levels: [1, 2, 3] }),
    CodeBlockLowlight.configure({ lowlight }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeaderBg,
    TableCellBg,
    Image.configure({ inline: false, allowBase64: true }),
    Link.configure({ openOnClick: false, autolink: true }),
    TextStyle,
    TextColor
  ]

  if (!options.forExport) {
    extensions.push(
      Placeholder.configure({
        placeholder: options.placeholder ?? ''
      }),
      SlashMenu,
      SearchReplace
    )
  }

  return extensions
}
