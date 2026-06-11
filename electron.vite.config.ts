import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
        output: {
          // Split the heavy vendor libraries out of the app chunk so app code
          // parses faster and rebuilds stay incremental.
          manualChunks(id: string): string | undefined {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('highlight.js') || id.includes('lowlight')) return 'highlight'
            if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor'
            return 'vendor'
          }
        }
      }
    }
  }
})
