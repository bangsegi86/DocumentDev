import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { getSlashCommands, type SlashCommandItem } from '../menus/slashCommands'
import { SlashMenuList, type SlashMenuListRef } from '../menus/SlashMenuList'

/**
 * "/" quick-insert menu. Built on @tiptap/suggestion; renders a keyboard-
 * navigable React popup (in a tippy.js popover) listing block commands
 * (headings, lists, table, code block, etc.). Editor-only — not used on export.
 */
export const SlashMenu = Extension.create({
  name: 'slashMenu',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        items: ({ query }) => getSlashCommands(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let component: ReactRenderer<SlashMenuListRef> | null = null
          let popup: TippyInstance | null = null

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenuList, {
                props,
                editor: props.editor
              })
              if (!props.clientRect) return
              popup = tippy(document.body, {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start'
              })
            },
            onUpdate: (props) => {
              component?.updateProps(props)
              if (props.clientRect) {
                popup?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect })
              }
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup?.hide()
                return true
              }
              return component?.ref?.onKeyDown(props.event) ?? false
            },
            onExit: () => {
              popup?.destroy()
              component?.destroy()
              popup = null
              component = null
            }
          }
        }
      })
    ]
  }
})
