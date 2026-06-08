import { useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'

const MAX = 8

/** Notion-style hover grid to choose table dimensions. */
export function TableGridPicker({
  onPick
}: {
  onPick: (rows: number, cols: number) => void
}): JSX.Element {
  const { t } = useI18n()
  const [hover, setHover] = useState({ rows: 0, cols: 0 })

  return (
    <div className="grid-picker">
      <div className="grid-picker-cells">
        {Array.from({ length: MAX }).map((_, r) =>
          Array.from({ length: MAX }).map((__, c) => {
            const active = r < hover.rows && c < hover.cols
            return (
              <div
                key={`${r}-${c}`}
                className={`grid-cell ${active ? 'active' : ''}`}
                onMouseEnter={() => setHover({ rows: r + 1, cols: c + 1 })}
                onClick={() => onPick(r + 1, c + 1)}
              />
            )
          })
        )}
      </div>
      <div className="grid-picker-label">
        {hover.rows > 0
          ? `${hover.rows} × ${hover.cols}`
          : `${t('rows')} × ${t('cols')}`}
      </div>
    </div>
  )
}
