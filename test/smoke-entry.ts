import { exportHtml } from '../src/renderer/export/exportHtml'
import { exportWord } from '../src/renderer/export/exportWord'
import { extractPayload } from '../src/shared/fileFormat'
import { deriveToc } from '../src/renderer/toc/toc'
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
assert(html.includes('<span class="doc-topbar-title">RMS Interface Doc</span>'), 'top bar shows title')
assert(html.includes('id="doc-sidebar-toggle"'), 'export has sidebar hamburger toggle')
assert(html.includes('class="doc-sidebar"'), 'has left sidebar')
assert(html.includes('class="doc-content"'), 'has center content')
assert(html.includes('id="doc-breadcrumb"'), 'has breadcrumb element')
assert(html.includes("querySelector('.doc-content')"), 'has breadcrumb scroll script')

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

console.log('== TOC rebuilds from re-opened document (sidebar not empty after Open) ==')
const reopenedToc = deriveToc(parsed!.tiptapDoc)
assert(reopenedToc.length === 3, `re-opened doc yields ${reopenedToc.length} headings`)
assert(reopenedToc[0].id === 'change-station-status', 're-opened TOC keeps anchor ids')

console.log('== text color + cell background + Word export ==')
const styledDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', marks: [{ type: 'textStyle', attrs: { color: '#ff0000' } }], text: 'red' }]
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              attrs: { backgroundColor: '#ffff00' },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'cell' }] }]
            }
          ]
        }
      ]
    }
  ]
}
const styledFile: DocFile = { version: 1, title: 'X', lang: 'ko', theme: defaultTheme, tiptapDoc: styledDoc }
const styledHtml = exportHtml(styledFile)
assert(/color:\s*#ff0000/i.test(styledHtml), 'text color renders in HTML export')
assert(/background-color:\s*#ffff00/i.test(styledHtml), 'cell background renders in HTML export')
const word = exportWord(styledFile)
assert(word.includes('urn:schemas-microsoft-com:office:word'), 'Word export has MS Office namespace')
assert(/background-color:\s*#ffff00/i.test(word), 'cell background renders in Word export')
assert(/color:\s*#ff0000/i.test(word), 'text color renders in Word export')

console.log('== image: width/align/base64 survive export + round-trip ==')
const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const imgDoc = {
  type: 'doc',
  content: [
    { type: 'image', attrs: { src: `data:image/png;base64,${b64}`, width: 300, align: 'center', alt: 'logo' } }
  ]
}
const imgFile: DocFile = { version: 1, title: 'Img', lang: 'ko', theme: defaultTheme, tiptapDoc: imgDoc }
const imgHtml = exportHtml(imgFile)
assert(/<img[^>]*\bwidth="300"/.test(imgHtml), 'image width attribute survives generateHTML')
assert(/<img[^>]*data-align="center"/.test(imgHtml), 'image data-align survives generateHTML')
assert(imgHtml.includes(b64), 'base64 image embedded (self-contained)')
assert(/<img[^>]*alt="logo"/.test(imgHtml), 'image alt survives')
assert(imgHtml.includes("img[data-align='center']"), 'alignment CSS inlined into export')
const imgReopened = extractPayload(imgHtml)
assert(imgReopened !== null, 'image doc round-trips')
const imgNode = imgReopened!.tiptapDoc.content![0]
assert(imgNode.attrs!.width === 300 && imgNode.attrs!.align === 'center', 'image width/align persist in payload JSON')
const imgWord = exportWord(imgFile)
assert(/<img/.test(imgWord) && imgWord.includes(b64), 'image embedded in Word export')
assert(/<p align="center"><img/.test(imgWord), 'centered image wrapped for Word')

import { writeFileSync } from 'node:fs'
writeFileSync('out/sample.html', html, 'utf-8')
writeFileSync('out/sample.doc', word, 'utf-8')
console.log('\nwrote out/sample.html (' + html.length + ' bytes)')

console.log('\nALL SMOKE TESTS PASSED')
