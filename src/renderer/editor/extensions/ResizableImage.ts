import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { Plugin } from '@tiptap/pm/state'
import { ImageNodeView } from './ImageNodeView'

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
            const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
              f.type.startsWith('image/')
            )
            if (files.length === 0) return false
            event.preventDefault()
            files.forEach((file) => {
              const reader = new FileReader()
              reader.onload = () => {
                const src = reader.result as string // base64 data URI
                const node = view.state.schema.nodes.image.create({ src })
                view.dispatch(view.state.tr.replaceSelectionWith(node))
              }
              reader.readAsDataURL(file)
            })
            return true
          }
        }
      })
    ]
  }
})
