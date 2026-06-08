/// <reference types="vite/client" />
import type { DocApi } from '@shared/types'

declare module '*.css?raw' {
  const content: string
  export default content
}

declare global {
  interface Window {
    api: DocApi
  }
}
