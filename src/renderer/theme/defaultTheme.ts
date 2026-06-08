import type { ThemeSettings } from '@shared/types'

/** Default theme mirroring the Mushiny "RMS Interface Doc" look from the reference. */
export const defaultTheme: ThemeSettings = {
  titleText: 'RMS Interface Doc',
  topBarColor: '#1f3a5f',
  topBarTextColor: '#ffffff',
  sidebarColor: '#f3f4f6',
  sidebarTextColor: '#374151',
  headingColor: '#2f5f8f',
  linkColor: '#2563eb',
  tableBorderColor: '#cbd5e1',
  tableHeaderBackground: '#f1f5f9',
  codeBlockBackground: '#f5f6f8',
  bodyTextColor: '#1f2937',
  bodyFont: "-apple-system, 'Segoe UI', 'Malgun Gothic', 'Apple SD Gothic Neo', Roboto, sans-serif",
  bodyFontSize: '15px'
}

export const FONT_OPTIONS: { value: string; label: string }[] = [
  {
    value: "-apple-system, 'Segoe UI', 'Malgun Gothic', 'Apple SD Gothic Neo', Roboto, sans-serif",
    label: 'System Sans (기본)'
  },
  { value: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif", label: '맑은 고딕 / Apple Gothic' },
  { value: "Georgia, 'Times New Roman', serif", label: 'Serif' },
  { value: "'Noto Sans KR', sans-serif", label: 'Noto Sans KR' }
]
