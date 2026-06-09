import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { SlashCommandItem } from './slashCommands'

export interface SlashMenuListRef {
  onKeyDown: (event: KeyboardEvent) => boolean
}

interface Props {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}

/** Keyboard-navigable popup list shown when the user types "/". */
export const SlashMenuList = forwardRef<SlashMenuListRef, Props>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0)

  useEffect(() => setSelected(0), [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) return false
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        command(items[selected])
        return true
      }
      return false
    }
  }))

  if (items.length === 0) {
    return <div className="slash-menu slash-menu-empty">—</div>
  }

  return (
    <div className="slash-menu">
      {items.map((item, i) => (
        <button
          type="button"
          key={item.key}
          className={`slash-item ${i === selected ? 'active' : ''}`}
          onMouseEnter={() => setSelected(i)}
          onMouseDown={(e) => {
            e.preventDefault()
            command(item)
          }}
        >
          <span className="slash-icon">{item.icon}</span>
          <span className="slash-title">{item.title}</span>
        </button>
      ))}
    </div>
  )
})

SlashMenuList.displayName = 'SlashMenuList'
