import { useEffect, useRef, useState } from 'react'
import { useDocumentStore } from '../state/documentStore'
import { useI18n } from '../i18n/I18nContext'
import { FONT_OPTIONS } from './defaultTheme'
import { ColorField, PRESET_COLORS } from './ColorField'
import type { ThemeSettings } from '@shared/types'

type ColorKey = Extract<
  keyof ThemeSettings,
  | 'topBarColor'
  | 'topBarTextColor'
  | 'sidebarColor'
  | 'sidebarTextColor'
  | 'linkColor'
  | 'tableBorderColor'
  | 'tableHeaderBackground'
  | 'codeBlockBackground'
  | 'breadcrumbColor'
  | 'bodyTextColor'
>

const COLOR_FIELDS: ColorKey[] = [
  'topBarColor',
  'topBarTextColor',
  'sidebarColor',
  'sidebarTextColor',
  'linkColor',
  'tableBorderColor',
  'tableHeaderBackground',
  'codeBlockBackground',
  'breadcrumbColor',
  'bodyTextColor'
]

/** One heading level (주제/부제/소제): colour swatch + bold + italic toggles. */
function HeadingStyleRow({
  label,
  color,
  bold,
  italic,
  onColor,
  onBold,
  onItalic
}: {
  label: string
  color: string
  bold: boolean
  italic: boolean
  onColor: (c: string) => void
  onBold: () => void
  onItalic: () => void
}): JSX.Element {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
        <div className="theme-heading-controls">
          <button
            type="button"
            className="color-current"
            style={{ background: color }}
            title={color}
            onClick={() => setOpen((o) => !o)}
          />
          <button
            type="button"
            className={`theme-style-btn ${bold ? 'active' : ''}`}
            title={t('bold')}
            onClick={onBold}
          >
            <b>B</b>
          </button>
          <button
            type="button"
            className={`theme-style-btn ${italic ? 'active' : ''}`}
            title={t('italic')}
            onClick={onItalic}
          >
            <i>I</i>
          </button>
        </div>
      </div>

      {open && (
        <div className="color-palette">
          <div className="color-grid">
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`color-swatch ${c.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
                style={{ background: c }}
                title={c}
                onClick={() => {
                  onColor(c)
                  setOpen(false)
                }}
              />
            ))}
          </div>
          <label className="color-custom">
            <span>{t('customColor')}</span>
            <input type="color" value={color} onChange={(e) => onColor(e.target.value)} />
          </label>
        </div>
      )}
    </div>
  )
}

export function ThemePanel(): JSX.Element {
  const { t } = useI18n()
  const theme = useDocumentStore((s) => s.theme)
  const setTheme = useDocumentStore((s) => s.setTheme)
  const resetTheme = useDocumentStore((s) => s.resetTheme)

  const pickLogo = async (): Promise<void> => {
    const res = await window.api.openImage()
    if (!res.canceled && res.dataUri) setTheme({ logoDataUrl: res.dataUri })
  }

  const headings = [
    { label: t('h1Short'), c: 'h1Color', b: 'h1Bold', i: 'h1Italic' },
    { label: t('h2Short'), c: 'h2Color', b: 'h2Bold', i: 'h2Italic' },
    { label: t('h3Short'), c: 'h3Color', b: 'h3Bold', i: 'h3Italic' }
  ] as const

  return (
    <aside className="theme-panel">
      <h2>{t('theme')}</h2>

      <div className="theme-row theme-logo-row">
        <span>{t('topbarLogo')}</span>
        <div className="theme-logo-controls">
          {theme.logoDataUrl ? (
            <>
              <img className="theme-logo-preview" src={theme.logoDataUrl} alt="logo" />
              <button type="button" onClick={() => void pickLogo()}>
                {t('changeLogo')}
              </button>
              <button type="button" onClick={() => setTheme({ logoDataUrl: '' })}>
                {t('removeLogo')}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => void pickLogo()}>
              {t('addLogo')}
            </button>
          )}
        </div>
      </div>

      <div className="theme-group-label">{t('headingStyles')}</div>
      {headings.map((h) => (
        <HeadingStyleRow
          key={h.c}
          label={h.label}
          color={theme[h.c] as string}
          bold={theme[h.b] as boolean}
          italic={theme[h.i] as boolean}
          onColor={(color) => setTheme({ [h.c]: color } as Partial<ThemeSettings>)}
          onBold={() => setTheme({ [h.b]: !(theme[h.b] as boolean) } as Partial<ThemeSettings>)}
          onItalic={() => setTheme({ [h.i]: !(theme[h.i] as boolean) } as Partial<ThemeSettings>)}
        />
      ))}

      {COLOR_FIELDS.map((key) => (
        <ColorField
          key={key}
          label={t(key)}
          value={theme[key]}
          onChange={(color) => setTheme({ [key]: color } as Partial<ThemeSettings>)}
        />
      ))}

      <label className="theme-row">
        <span>{t('bodyFont')}</span>
        <select value={theme.bodyFont} onChange={(e) => setTheme({ bodyFont: e.target.value })}>
          {FONT_OPTIONS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>

      <label className="theme-row">
        <span>{t('bodyFontSize')}</span>
        <select
          value={theme.bodyFontSize}
          onChange={(e) => setTheme({ bodyFontSize: e.target.value })}
        >
          {['10pt', '11pt', '12pt', '13px', '14px', '15px', '16px', '17px', '18px'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="theme-reset" onClick={resetTheme}>
        {t('resetTheme')}
      </button>
    </aside>
  )
}
