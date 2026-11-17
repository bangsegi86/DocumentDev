import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'

export const searchPluginKey = new PluginKey('searchReplace')

export interface Match {
  from: number
  to: number
}

interface SearchState {
  term: string
  caseSensitive: boolean
  matches: Match[]
  current: number
  deco: DecorationSet
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchReplace: {
      setSearchTerm: (term: string) => ReturnType
      setSearchCaseSensitive: (value: boolean) => ReturnType
      findNext: () => ReturnType
      findPrevious: () => ReturnType
      replaceCurrent: (text: string) => ReturnType
      replaceAll: (text: string) => ReturnType
      clearSearch: () => ReturnType
    }
  }
}

/** Lower-case without changing the string length (a few characters, e.g.
 *  'İ', lower-case to two code units; those are left as is), so character
 *  indexes keep mapping to document positions. */
function lowerSameLength(text: string): string {
  const lower = text.toLowerCase()
  if (lower.length === text.length) return lower
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const l = text[i].toLowerCase()
    out += l.length === 1 ? l : text[i]
  }
  return out
}

/**
 * Find every occurrence of `term`. Text is searched per textblock (paragraph,
 * heading, cell paragraph, code block) with its text nodes joined, so a match
 * may span formatting changes ("Hello **world**" matches "lo wo"). Inline
 * non-text nodes (e.g. a hard break) act as a separator a match can't cross.
 */
function gatherMatches(doc: PMNode, term: string, caseSensitive: boolean): Match[] {
  const matches: Match[] = []
  if (!term) return matches
  const needle = caseSensitive ? term : lowerSameLength(term)
  doc.descendants((block, blockPos) => {
    if (!block.isTextblock) return true
    let text = ''
    const posAt: number[] = [] // document position of each char in `text`
    block.forEach((child, offset) => {
      const start = blockPos + 1 + offset
      if (child.isText && child.text) {
        text += child.text
        for (let i = 0; i < child.text.length; i++) posAt.push(start + i)
      } else {
        text += '\uFFFF' // separator that never matches user input
        posAt.push(start)
      }
    })
    const haystack = caseSensitive ? text : lowerSameLength(text)
    let idx = haystack.indexOf(needle)
    while (idx !== -1) {
      matches.push({ from: posAt[idx], to: posAt[idx + needle.length - 1] + 1 })
      idx = haystack.indexOf(needle, idx + needle.length)
    }
    return false
  })
  return matches
}

function buildDeco(doc: PMNode, matches: Match[], current: number): DecorationSet {
  const decos = matches.map((m, i) =>
    Decoration.inline(m.from, m.to, {
      class: i === current ? 'search-match search-match-current' : 'search-match'
    })
  )
  return DecorationSet.create(doc, decos)
}

export function getSearchState(state: EditorState): SearchState {
  return searchPluginKey.getState(state) as SearchState
}

/** Find & Replace: highlights matches, navigates between them, and replaces. */
export const SearchReplace = Extension.create({
  name: 'searchReplace',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchPluginKey,
        state: {
          init: () => ({
            term: '',
            caseSensitive: false,
            matches: [],
            current: 0,
            deco: DecorationSet.empty
          }),
          apply(tr, value, _oldState, newState) {
            const meta = tr.getMeta(searchPluginKey) as Partial<SearchState> | undefined
            if (!meta && !tr.docChanged) return value

            const term = meta && 'term' in meta ? meta.term! : value.term
            const caseSensitive =
              meta && 'caseSensitive' in meta ? meta.caseSensitive! : value.caseSensitive
            const matches = gatherMatches(newState.doc, term, caseSensitive)
            let current = meta && 'current' in meta ? meta.current! : value.current
            if (current >= matches.length) current = matches.length > 0 ? matches.length - 1 : 0
            if (current < 0) current = 0
            return { term, caseSensitive, matches, current, deco: buildDeco(newState.doc, matches, current) }
          }
        },
        props: {
          decorations(state) {
            return (searchPluginKey.getState(state) as SearchState).deco
          }
        }
      })
    ]
  },

  addCommands() {
    return {
      setSearchTerm:
        (term) =>
        ({ state, dispatch }) => {
          dispatch?.(state.tr.setMeta(searchPluginKey, { term, current: 0 }))
          return true
        },

      setSearchCaseSensitive:
        (value) =>
        ({ state, dispatch }) => {
          dispatch?.(state.tr.setMeta(searchPluginKey, { caseSensitive: value, current: 0 }))
          return true
        },

      findNext:
        () =>
        ({ state, dispatch }) => {
          const s = getSearchState(state)
          if (!s.matches.length) return false
          const next = (s.current + 1) % s.matches.length
          const m = s.matches[next]
          const tr = state.tr.setMeta(searchPluginKey, { current: next })
          tr.setSelection(TextSelection.create(tr.doc, m.from, m.to)).scrollIntoView()
          dispatch?.(tr)
          return true
        },

      findPrevious:
        () =>
        ({ state, dispatch }) => {
          const s = getSearchState(state)
          if (!s.matches.length) return false
          const prev = (s.current - 1 + s.matches.length) % s.matches.length
          const m = s.matches[prev]
          const tr = state.tr.setMeta(searchPluginKey, { current: prev })
          tr.setSelection(TextSelection.create(tr.doc, m.from, m.to)).scrollIntoView()
          dispatch?.(tr)
          return true
        },

      replaceCurrent:
        (text) =>
        ({ state, dispatch }) => {
          const s = getSearchState(state)
          const m = s.matches[s.current]
          if (!m) return false
          dispatch?.(state.tr.insertText(text, m.from, m.to))
          return true
        },

      replaceAll:
        (text) =>
        ({ state, dispatch }) => {
          const s = getSearchState(state)
          if (!s.matches.length) return false
          const tr = state.tr
          // Replace from last to first so earlier match positions stay valid.
          for (let i = s.matches.length - 1; i >= 0; i--) {
            const m = s.matches[i]
            tr.insertText(text, m.from, m.to)
          }
          dispatch?.(tr)
          return true
        },

      clearSearch:
        () =>
        ({ state, dispatch }) => {
          dispatch?.(state.tr.setMeta(searchPluginKey, { term: '', current: 0 }))
          return true
        }
    }
  }
})
