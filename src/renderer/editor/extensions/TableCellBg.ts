import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'

/** A `backgroundColor` cell attribute, rendered as an inline style so it shows
 *  in the editor AND in the exported HTML/Word. Set via the table context menu. */
const backgroundColor = {
  backgroundColor: {
    default: null as string | null,
    parseHTML: (el: HTMLElement): string | null =>
      el.style.backgroundColor || el.getAttribute('data-background-color') || null,
    renderHTML: (attrs: { backgroundColor?: string | null }) =>
      attrs.backgroundColor
        ? {
            style: `background-color: ${attrs.backgroundColor}`,
            'data-background-color': attrs.backgroundColor
          }
        : {}
  }
}

export const TableCellBg = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...backgroundColor }
  }
})

export const TableHeaderBg = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...backgroundColor }
  }
})
