import { useRef, useState } from 'react'
import { useDocumentStore } from './state/documentStore'
import { useTabsStore } from './state/tabsStore'
import { useI18n } from './i18n/I18nContext'

/** Document tabs. The active tab's title/dirty come from the live document
 *  store; inactive tabs from their saved snapshot records. */
export function TabBar({
  onSelect,
  onClose,
  onNew
}: {
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
}): JSX.Element | null {
  const { t } = useI18n()
  const tabs = useTabsStore((s) => s.tabs)
  const activeId = useTabsStore((s) => s.activeId)
  const moveTab = useTabsStore((s) => s.moveTab)
  const liveTitle = useDocumentStore((s) => s.title)
  const liveDirty = useDocumentStore((s) => s.dirty)
  const dragId = useRef<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  // A single tab adds no value — hide the bar until there are at least two.
  if (tabs.length <= 1) return null

  return (
    <div className="tab-bar" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId
        const title = (isActive ? liveTitle : tab.title) || t('untitled')
        const dirty = isActive ? liveDirty : tab.dirty
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`tab ${isActive ? 'active' : ''} ${dropTarget === tab.id ? 'drop-target' : ''}`}
            title={title}
            draggable
            onDragStart={() => (dragId.current = tab.id)}
            onDragOver={(e) => {
              e.preventDefault()
              if (dragId.current && dragId.current !== tab.id) setDropTarget(tab.id)
            }}
            onDragLeave={() => setDropTarget((d) => (d === tab.id ? null : d))}
            onDrop={(e) => {
              e.preventDefault()
              if (dragId.current && dragId.current !== tab.id) moveTab(dragId.current, tab.id)
              dragId.current = null
              setDropTarget(null)
            }}
            onDragEnd={() => {
              dragId.current = null
              setDropTarget(null)
            }}
            onMouseDown={(e) => {
              // Middle-click closes; left-click selects.
              if (e.button === 1) {
                e.preventDefault()
                onClose(tab.id)
              } else if (e.button === 0) {
                onSelect(tab.id)
              }
            }}
          >
            {dirty && <span className="tab-dot">•</span>}
            <span className="tab-title">{title}</span>
            <button
              type="button"
              className="tab-close"
              title={t('closeTab')}
              aria-label={t('closeTab')}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onClose(tab.id)
              }}
            >
              ×
            </button>
          </div>
        )
      })}
      <button type="button" className="tab-new" title={t('newTab')} aria-label={t('newTab')} onClick={onNew}>
        +
      </button>
    </div>
  )
}
