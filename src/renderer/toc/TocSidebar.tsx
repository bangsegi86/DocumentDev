import { useI18n } from '../i18n/I18nContext'
import type { TocItem } from './toc'

export function TocSidebar({
  items,
  onSelect
}: {
  items: TocItem[]
  onSelect: (id: string) => void
}): JSX.Element {
  const { t } = useI18n()

  if (items.length === 0) {
    return (
      <nav className="doc-sidebar">
        <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>{t('noHeadings')}</p>
      </nav>
    )
  }

  return (
    <nav className="doc-sidebar">
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
              {item.text || ' '}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
