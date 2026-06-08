import type { DocApi } from '../shared/types'

declare global {
  interface Window {
    api: DocApi
  }
}

export {}
