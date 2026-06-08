import esbuild from 'esbuild'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)

// Resolve "*.css?raw" and bare "*.css" imports to their text contents so the
// renderer export pipeline (which inlines CSS) can run under Node for testing.
const cssTextPlugin = {
  name: 'css-as-text',
  setup(build) {
    build.onResolve({ filter: /\.css(\?raw)?$/ }, (args) => {
      const clean = args.path.replace(/\?raw$/, '')
      const path = clean.startsWith('.')
        ? new URL(clean, pathToFileURL(args.importer)).pathname
        : require.resolve(clean)
      return { path, namespace: 'css-text' }
    })
    build.onLoad({ filter: /.*/, namespace: 'css-text' }, async (args) => {
      const contents = await readFile(args.path, 'utf8')
      return { contents, loader: 'text' }
    })
  }
}

await esbuild.build({
  entryPoints: ['test/smoke-entry.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'out/smoke.cjs',
  logLevel: 'error',
  alias: {
    '@shared': resolve('src/shared'),
    '@renderer': resolve('src/renderer')
  },
  plugins: [cssTextPlugin]
})

await import(pathToFileURL('out/smoke.cjs').href)
