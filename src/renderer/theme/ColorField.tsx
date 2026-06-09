import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'

/** PowerPoint-style standard color palette (click to pick). */
export const PRESET_COLORS: string[] = [
  // grayscale
  '#ffffff', '#f3f4f6', '#e5e7eb', '#9ca3af', '#6b7280', '#374151', '#1f2937', '#000000',
  // blues (doc default family)
  '#eff6ff', '#bfdbfe', '#60a5fa', '#3b82f6', '#2563eb', '#1f3a5f', '#2f5f8f', '#0ea5e9',
  // greens / teals
  '#ecfdf5', '#86efac', '#22c55e', '#10b981', '#0d9488', '#14b8a6', '#06b6d4', '#155e75',
  // warm / accent
  '#fef9c3', '#fde047', '#f59e0b', '#f97316', '#ef4444', '#dc2626', '#a855f7', '#ec4899'
]

export function ColorField({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (color: string) => void
}): JSX.Element {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close the palette when clicking outside the field.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="color-field" ref={ref}>
      <div className="theme-row">
        <span>{label}</span>
        <button
          type="button"
          className="color-current"
          style={{ background: value }}
          title={value}
          onClick={() => setOpen((o) => !o)}
        />
      </div>

      {open && (
        <div className="color-palette">
          <div className="color-grid">
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`color-swatch ${c.toLowerCase() === value.toLowerCase() ? 'active' : ''}`}
                style={{ background: c }}
                title={c}
                onClick={() => {
                  onChange(c)
                  setOpen(false)
                }}
              />
            ))}
          </div>
          <label className="color-custom">
            <span>{t('customColor')}</span>
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
          </label>
        </div>
      )}
    </div>
  )
}
