import { useI18n } from '../i18n/I18nContext'
import type { TocItem } from './toc'

export function TocSidebar({
  items,
  onSelect,
  collapsed,
  onToggle
}: {
  items: TocItem[]
  onSelect: (id: string) => void
  collapsed: boolean
  onToggle: () => void
}): JSX.Element {
  const { t } = useI18n()

  return (
    <nav className="doc-sidebar">
      <button
        className="doc-sidebar-toggle"
        type="button"
        title={t('contents')}
        aria-label={t('contents')}
        onClick={onToggle}
      >
        ☰
      </button>
      <div className="doc-toc" hidden={collapsed}>
        {items.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>{t('noHeadings')}</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <a
                  className={`toc-h${item.level}`}
                  onClick={(e) => {
                    e.preventDefault()
                    onSelect(item.id)
                  }}
                >
                  {item.text || ' '}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  )
}
