import { createContext, useContext, type ReactNode } from 'react'
import { ko } from './ko'
import { en } from './en'
import type { Lang } from '@shared/types'

type StringKey = keyof typeof ko

const DICTS: Record<Lang, Record<StringKey, string>> = { ko, en }

interface I18nValue {
  lang: Lang
  t: (key: StringKey) => string
}

const I18nContext = createContext<I18nValue>({ lang: 'ko', t: (k) => ko[k] })

export function I18nProvider({
  lang,
  children
}: {
  lang: Lang
  children: ReactNode
}): JSX.Element {
  const t = (key: StringKey): string => DICTS[lang][key] ?? key
  return <I18nContext.Provider value={{ lang, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  return useContext(I18nContext)
}
