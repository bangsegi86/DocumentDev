import { exportHtml } from '../src/renderer/export/exportHtml'
import { extractPayload } from '../src/shared/fileFormat'
import { defaultTheme } from '../src/renderer/theme/defaultTheme'
import type { DocFile } from '../src/shared/types'

const doc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1, id: 'change-station-status' }, content: [{ type: 'text', text: 'Change station status' }] },
    { type: 'heading', attrs: { level: 2, id: 'basic-info' }, content: [{ type: 'text', text: 'Basic Info' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'change station status' }] },
    {
      type: 'codeBlock',
      attrs: { language: 'json' },
      content: [{ type: 'text', text: '{\n  "stationCode": "9_270",\n  "stationStatus": "STOP"\n}' }]
    },
    { type: 'heading', attrs: { level: 3, id: 'request-param' }, content: [{ type: 'text', text: 'Request Param' }] },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Param Name' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Is Required' }] }] }
          ]
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Content-Type' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Yes' }] }] }
          ]
        }
      ]
    }
  ]
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg)
  console.log('  ok -', msg)
}

const docFile: DocFile = { version: 1, title: 'RMS Interface Doc', lang: 'ko', theme: defaultTheme, tiptapDoc: doc }
const html = exportHtml(docFile)

console.log('== exported HTML structure ==')
assert(html.startsWith('<!doctype html>'), 'has doctype')
assert(html.includes('<header class="doc-topbar">RMS Interface Doc</header>'), 'top bar shows title')
assert(html.includes('class="doc-sidebar"'), 'has left sidebar')
assert(html.includes('class="doc-content"'), 'has center content')

console.log('== sidebar TOC links ==')
assert(html.includes('href="#change-station-status"'), 'TOC links to H1 anchor')
assert(html.includes('href="#basic-info"'), 'TOC links to H2 anchor')
assert(html.includes('href="#request-param"'), 'TOC links to H3 anchor')
assert(html.includes('id="change-station-status"'), 'H1 has matching anchor id')

console.log('== content rendering ==')
assert(html.includes('<table'), 'table rendered')
assert(/<pre><code class="hljs language-json">/.test(html), 'code block pre-highlighted with hljs class')
assert(html.includes('<span class="hljs-'), 'code block contains highlight spans (offline colors)')

console.log('== self-containment ==')
assert(!/src="https?:\/\//.test(html) && !/href="https?:\/\/[^"]*\.css/.test(html), 'no external CDN resources')
assert(html.includes('.doc-topbar') && html.includes('--doc-topbar-bg'), 'layout + theme CSS inlined')

console.log('== round-trip payload ==')
const parsed = extractPayload(html)
assert(parsed !== null, 'payload extracted from exported file')
assert(parsed!.title === 'RMS Interface Doc', 'title preserved')
assert(parsed!.tiptapDoc.content!.length === doc.content.length, 'document body preserved')
assert(parsed!.theme.topBarColor === defaultTheme.topBarColor, 'theme preserved')

import { writeFileSync } from 'node:fs'
writeFileSync('out/sample.html', html, 'utf-8')
console.log('\nwrote out/sample.html (' + html.length + ' bytes)')

console.log('\nALL SMOKE TESTS PASSED')
