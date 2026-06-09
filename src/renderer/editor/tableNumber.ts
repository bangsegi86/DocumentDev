import type { Editor } from '@tiptap/react'
import type { Node as PMNode } from '@tiptap/pm/model'

/**
 * Add a number column at the FRONT of the table containing the selection.
 * The header row (if any) gets `headerLabel`; each body row gets 1, 2, 3, ….
 * Numbers are filled once (static) — re-run after adding rows to renumber.
 */
export function addNumberColumn(editor: Editor, headerLabel: string): boolean {
  const { state } = editor
  const { schema, selection } = state
  const $from = selection.$from

  let tableNode: PMNode | null = null
  let tablePos = -1
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.type.name === 'table') {
      tableNode = node
      tablePos = $from.before(d)
      break
    }
  }
  if (!tableNode) return false

  const { tableCell, tableHeader, tableRow, paragraph } = schema.nodes
  const makeCell = (isHeader: boolean, text: string | null): PMNode => {
    const para = paragraph.create(null, text ? schema.text(text) : null)
    return (isHeader ? tableHeader : tableCell).create(null, para)
  }

  const rows: PMNode[] = []
  let counter = 0
  tableNode.forEach((row) => {
    const isHeaderRow = row.firstChild?.type.name === 'tableHeader'
    const cells: PMNode[] = []
    if (isHeaderRow) {
      cells.push(makeCell(true, headerLabel))
    } else {
      counter += 1
      cells.push(makeCell(false, String(counter)))
    }
    row.forEach((cell) => cells.push(cell))
    rows.push(tableRow.create(row.attrs, cells))
  })

  const newTable = tableNode.type.create(tableNode.attrs, rows)
  const tr = state.tr.replaceWith(tablePos, tablePos + tableNode.nodeSize, newTable)
  editor.view.dispatch(tr)
  return true
}
