import type { Editor } from '@tiptap/react'
import type { Node as PMNode } from '@tiptap/pm/model'

/** Fixed width (px) for the number column — wide enough for the "번호/No."
 *  header and a 2-digit value to stay on a single line. */
const NUMBER_COL_WIDTH = 68
const MIN_COL_WIDTH = 40

/**
 * Auto-fit the table containing the selection:
 *  - the number column (header === `numberLabel`) is locked to a fixed 2-digit
 *    width;
 *  - every other column is sized to its content (measured by briefly switching
 *    the live <table> to auto layout), then scaled to fill the table width.
 *
 * Widths are written as prosemirror-tables `colwidth` attributes so they persist
 * and survive export. Assumes simple (colspan/rowspan = 1) data tables, but
 * handles colspan by spreading the per-column widths across spanned columns.
 */
export function autoFitTable(editor: Editor, numberLabel: string): boolean {
  const { state, view } = editor
  const $from = state.selection.$from

  let table: PMNode | null = null
  let tablePos = -1
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.type.name === 'table') {
      table = node
      tablePos = $from.before(d)
      break
    }
  }
  if (!table) return false

  // Locate the live <table> element to measure content widths.
  const dom = view.nodeDOM(tablePos) as HTMLElement | null
  const tableEl =
    dom && dom.tagName === 'TABLE' ? dom : (dom?.querySelector('table') as HTMLElement | null)
  const firstRow = tableEl?.querySelector('tr')
  if (!tableEl || !firstRow) return false

  // Measure: temporarily drop the fixed column widths and use auto layout so the
  // browser sizes each column to its content (constrained to the table width).
  const cols = Array.from(tableEl.querySelectorAll('col'))
  const prevColW = cols.map((c) => c.style.width)
  const prevLayout = tableEl.style.tableLayout
  const prevWidth = tableEl.style.width
  cols.forEach((c) => (c.style.width = ''))
  tableEl.style.tableLayout = 'auto'
  tableEl.style.width = '100%'
  const measured = Array.from(firstRow.children).map((td) =>
    (td as HTMLElement).getBoundingClientRect().width
  )
  // Restore the editor's fixed layout immediately.
  tableEl.style.tableLayout = prevLayout
  tableEl.style.width = prevWidth
  cols.forEach((c, i) => (c.style.width = prevColW[i]))

  const ncols = measured.length
  if (ncols === 0) return false
  const total = measured.reduce((a, b) => a + b, 0)

  // Is the first column a number column (by header label)?
  const firstCellText = (table.firstChild?.firstChild?.textContent ?? '').trim()
  const hasNumberCol = ncols > 1 && firstCellText === numberLabel.trim()

  // Target width per column.
  let widths: number[]
  if (hasNumberCol) {
    const othersTotal = total - measured[0]
    const scale = othersTotal > 0 ? (total - NUMBER_COL_WIDTH) / othersTotal : 1
    widths = measured.map((w, i) =>
      i === 0 ? NUMBER_COL_WIDTH : Math.max(MIN_COL_WIDTH, Math.round(w * scale))
    )
  } else {
    widths = measured.map((w) => Math.max(MIN_COL_WIDTH, Math.round(w)))
  }

  // Write colwidth attrs to every cell. Node sizes don't change, so absolute
  // positions computed from the original doc stay valid across setNodeMarkup.
  let tr = state.tr
  table.forEach((row, rowOffset) => {
    let col = 0
    row.forEach((cell, cellOffset) => {
      const span = (cell.attrs.colspan as number) || 1
      const cw: number[] = []
      for (let k = 0; k < span; k++) cw.push(widths[col + k] ?? widths[ncols - 1])
      col += span
      const cellPos = tablePos + 1 + rowOffset + 1 + cellOffset
      tr = tr.setNodeMarkup(cellPos, undefined, { ...cell.attrs, colwidth: cw })
    })
  })
  view.dispatch(tr)
  return true
}
