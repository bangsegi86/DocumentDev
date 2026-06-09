import { Extension } from '@tiptap/core'
import '@tiptap/extension-text-style'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textColor: {
      setColor: (color: string) => ReturnType
      unsetColor: () => ReturnType
    }
  }
}

/**
 * Text color as a global attribute on the textStyle mark.
 *
 * Renders BOTH an inline `style` (so the live editor shows the color) and a
 * `data-color` attribute. @tiptap/html strips inline `style` during export, so
 * `data-color` is the recoverable carrier that exportHtml/exportWord turn back
 * into an inline style. Replaces @tiptap/extension-color for this reason.
 */
export const TextColor = Extension.create({
  name: 'textColor',

  addOptions() {
    return { types: ['textStyle'] }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: (el: HTMLElement) =>
              el.getAttribute('data-color') || el.style.color || null,
            renderHTML: (attrs: { color?: string | null }) =>
              attrs.color
                ? { style: `color: ${attrs.color}`, 'data-color': attrs.color }
                : {}
          }
        }
      }
    ]
  },

  addCommands() {
    return {
      setColor:
        (color) =>
        ({ chain }) =>
          chain().setMark('textStyle', { color }).run(),
      unsetColor:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { color: null }).removeEmptyTextStyle().run()
    }
  }
})
