import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { Plugin } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { ImageNodeView } from './ImageNodeView'
import { downscaleDataUri } from '../../lib/downscaleImage'

function imageFiles(data: DataTransfer | null | undefined): File[] {
  return Array.from(data?.files ?? []).filter((f) => f.type.startsWith('image/'))
}

/** Read image files as base64 data URIs (export stays self-contained) and
 *  insert them at `pos`, or replace the current selection. */
function insertImageFiles(view: EditorView, files: File[], pos?: number): void {
  files.forEach((file) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const src = await downscaleDataUri(reader.result as string)
      const node = view.state.schema.nodes.image.create({ src })
      const { tr } = view.state
      if (pos === undefined) tr.replaceSelectionWith(node)
      else {
        // Block image at a drop point that may be mid-paragraph: replaceRangeWith
        // finds a valid spot (splitting the paragraph if needed).
        const at = Math.min(pos, tr.doc.content.size)
        tr.replaceRangeWith(at, at, node)
      }
      view.dispatch(tr)
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Image node with width + alignment, a resize NodeView, and clipboard-paste of
 * image files (embedded as base64 so export stays self-contained).
 *
 * IMPORTANT: width is rendered as the real `<img width>` attribute and align as
 * `data-align` — both are plain attributes that survive @tiptap/html's
 * generateHTML on export (inline `style` would be stripped). The NodeView is
 * editor-only; export uses renderHTML, so both read the same attributes.
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const attr = el.getAttribute('width')
          if (attr) return parseInt(attr, 10)
          const styleW = parseInt(el.style.width || '', 10)
          return Number.isNaN(styleW) ? null : styleW
        },
        renderHTML: (attrs: { width?: number | null }) =>
          attrs.width ? { width: attrs.width } : {}
      },
      align: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-align'),
        renderHTML: (attrs: { align?: string | null }) =>
          attrs.align ? { 'data-align': attrs.align } : {}
      },
      // Visible caption text shown under the image (distinct from `alt`).
      caption: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-caption') ?? '',
        renderHTML: (attrs: { caption?: string }) =>
          attrs.caption ? { 'data-caption': attrs.caption } : {}
      }
    }
  },

  // With a caption, wrap the image in <figure> + <figcaption>; otherwise emit a
  // bare <img> (unchanged). Alignment moves onto the figure so the caption
  // tracks the image width. The editor preview is handled by the NodeView.
  renderHTML({ node, HTMLAttributes }) {
    const imgAttrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
    const caption = (node.attrs.caption as string) || ''
    if (!caption) return ['img', imgAttrs]

    const align = node.attrs.align as string | null
    delete (imgAttrs as Record<string, unknown>)['data-align']
    const figAttrs: Record<string, unknown> = { class: 'doc-figure' }
    if (align) figAttrs['data-align'] = align
    return ['figure', figAttrs, ['img', imgAttrs], ['figcaption', { class: 'doc-figcaption' }, caption]]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const data = event.clipboardData
            // Excel/Word/PowerPoint put a bitmap snapshot of the copied range on
            // the clipboard NEXT TO the real cell text. If there is any plain
            // text, let the normal paste (incl. table-cell paste) handle it; an
            // image-only clipboard (screenshot, image copied from a browser —
            // which has HTML `<img>` but no text) is still embedded as base64.
            if (data?.getData('text/plain').trim()) return false
            const files = imageFiles(data)
            if (files.length === 0) return false
            event.preventDefault()
            insertImageFiles(view, files)
            return true
          },
          // Image files dragged in from the desktop are embedded at the drop
          // point (other drops — text, moving nodes — keep the default).
          handleDrop: (view, event, _slice, moved) => {
            if (moved) return false
            const files = imageFiles(event.dataTransfer)
            if (files.length === 0) return false
            event.preventDefault()
            const at = view.posAtCoords({ left: event.clientX, top: event.clientY })
            insertImageFiles(view, files, at?.pos)
            return true
          }
        }
      })
    ]
  }
})
