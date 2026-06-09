import { useDocumentStore } from '../state/documentStore'
import { useI18n } from '../i18n/I18nContext'
import { FONT_OPTIONS } from './defaultTheme'
import { ColorField } from './ColorField'
import type { ThemeSettings } from '@shared/types'

type ColorKey = Extract<
  keyof ThemeSettings,
  | 'topBarColor'
  | 'topBarTextColor'
  | 'sidebarColor'
  | 'sidebarTextColor'
  | 'headingColor'
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
  'headingColor',
  'linkColor',
  'tableBorderColor',
  'tableHeaderBackground',
  'codeBlockBackground',
  'breadcrumbColor',
  'bodyTextColor'
]

export function ThemePanel(): JSX.Element {
  const { t } = useI18n()
  const theme = useDocumentStore((s) => s.theme)
  const setTheme = useDocumentStore((s) => s.setTheme)
  const resetTheme = useDocumentStore((s) => s.resetTheme)

  return (
    <aside className="theme-panel">
      <h2>{t('theme')}</h2>

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
