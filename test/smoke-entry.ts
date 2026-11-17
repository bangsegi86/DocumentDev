import { exportHtml } from '../src/renderer/export/exportHtml'
import { exportWord } from '../src/renderer/export/exportWord'
import { extractPayload } from '../src/shared/fileFormat'
import { getSchema } from '@tiptap/core'
import { buildExtensions } from '../src/renderer/editor/extensions'
import { readFileSync } from 'node:fs'
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
assert(
  html.indexOf('id="doc-sidebar-toggle"') > html.indexOf('class="doc-sidebar"'),
  'hamburger lives inside the left sidebar (not the top bar)'
)
assert(html.includes('class="doc-sidebar"'), 'has left sidebar')

// Top-bar logo (CI) round-trips and renders before the title when set.
const logoFile: DocFile = {
  version: 1,
  title: 'Logo',
  lang: 'ko',
  theme: { ...defaultTheme, logoDataUrl: 'data:image/png;base64,AAAA' },
  tiptapDoc: doc
}
const logoHtml = exportHtml(logoFile)
assert(logoHtml.includes('<img class="doc-logo" src="data:image/png;base64,AAAA"'), 'top bar renders logo image')
assert(
  logoHtml.indexOf('class="doc-logo"') < logoHtml.indexOf('class="doc-topbar-title"'),
  'logo is positioned before the title'
)
assert(extractPayload(logoHtml)!.theme.logoDataUrl === 'data:image/png;base64,AAAA', 'logo round-trips in payload')
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

console.log('== per-heading styles (color / bold / italic) ==')
assert(html.includes('--doc-h1-color:') && html.includes('var(--doc-h1-color)'), 'per-heading style vars inlined and used')
const headTheme = { ...defaultTheme, h1Color: '#112233', h2Italic: true, h3Bold: false }
const headWord = exportWord({ version: 1, title: 'H', lang: 'ko', theme: headTheme, tiptapDoc: doc })
assert(/h1\s*{[^}]*color:\s*#112233/i.test(headWord), 'h1 custom color in Word export')
assert(/h2\s*{[^}]*font-style:\s*italic/i.test(headWord), 'h2 italic in Word export')
assert(/h3\s*{[^}]*font-weight:\s*400/i.test(headWord), 'h3 bold-off in Word export')

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

// Caption: a captioned image renders <figure>/<figcaption> and round-trips.
const capDoc = {
  type: 'doc',
  content: [
    {
      type: 'image',
      attrs: { src: `data:image/png;base64,${b64}`, align: 'center', alt: 'a', caption: 'Figure 1. Demo' }
    }
  ]
}
const capHtml = exportHtml({ version: 1, title: 'Cap', lang: 'ko', theme: defaultTheme, tiptapDoc: capDoc })
assert(/<figure[^>]*class="doc-figure"/.test(capHtml), 'captioned image renders a <figure>')
assert(capHtml.includes('<figcaption class="doc-figcaption">Figure 1. Demo</figcaption>'), 'caption text rendered')
assert(/<figure[^>]*data-align="center"/.test(capHtml), 'alignment moves onto the figure')
assert(extractPayload(capHtml)!.tiptapDoc.content![0].attrs!.caption === 'Figure 1. Demo', 'caption round-trips in payload')
// An image WITHOUT a caption still renders a bare <img> (no figure).
assert(!/<figure/.test(imgHtml), 'uncaptioned image stays a bare <img>')
const imgWord = exportWord(imgFile)
assert(/<img/.test(imgWord) && imgWord.includes(b64), 'image embedded in Word export')
assert(/<p align="center"><img/.test(imgWord), 'centered image wrapped for Word')

// Tampered theme values must not break out of the <style> block (A5).
const evilTheme = {
  ...defaultTheme,
  bodyFont: "Arial; } body { display:none } </style><script>alert(1)</script>",
  topBarColor: 'red;}</style><script>x()</script>'
}
const evil = { version: 1 as const, title: 'T', lang: 'ko' as const, theme: evilTheme, tiptapDoc: doc }
const evilHtml = exportHtml(evil)
const evilStyle = evilHtml.slice(evilHtml.indexOf('<style>'), evilHtml.indexOf('</style>') + 8)
assert(!/<script/i.test(evilStyle) && (evilHtml.match(/<\/style>/g) || []).length === 1, 'theme values cannot close <style> / inject <script> (HTML)')
const themeBlock = evilHtml.slice(evilHtml.lastIndexOf('--doc-topbar-bg:'))
assert(themeBlock.slice(0, themeBlock.indexOf('}')).includes('--doc-font-size:'), 'theme values cannot close the variable block early (no injected CSS rules)')
const evilWord = exportWord(evil)
assert((evilWord.match(/<\/style>/g) || []).length === 1 && !/alert\(1\)<\/script>/.test(evilWord), 'theme values cannot inject into Word export')

// ---- Payload size (B2/B3) ----
{
  const schema = getSchema(buildExtensions({ forExport: true }))
  const sameDoc = (a: unknown, b: unknown): boolean =>
    schema.nodeFromJSON(a as object).eq(schema.nodeFromJSON(b as object))

  // B2: the real sample (an older version-1 file) re-saves smaller and identical.
  const sampleHtml = readFileSync('sampleDoc/아성다이소 세종허브센터 Dipas Interface Doc.html', 'utf8')
  const sample = extractPayload(sampleHtml)!
  assert(!!sample && sample.version === 1, 'old version-1 sample file still opens')
  const resaved = exportHtml(sample)
  const reopened = extractPayload(resaved)!
  assert(sameDoc(sample.tiptapDoc, reopened.tiptapDoc), 'sample: re-saved document is identical after reopening')
  const payloadLen = (h: string): number => h.length - h.indexOf('id="docdev-data"')
  console.log(`    sample payload ${payloadLen(sampleHtml)} -> ${payloadLen(resaved)} chars`)
  assert(payloadLen(resaved) < payloadLen(sampleHtml) * 0.7, 'sample: embedded payload at least 30% smaller')
  assert(!resaved.includes('"backgroundColor":null'), 'default-valued attributes are not stored')

  // B3: each embedded image is stored once; refs resolve on reopen (incl. a
  // repeated image and the top-bar logo).
  const img2 = 'data:image/png;base64,' + Buffer.from('second-image-bytes').toString('base64')
  const imgUri = `data:image/png;base64,${b64}`
  const dupDoc = {
    type: 'doc',
    content: [
      { type: 'image', attrs: { src: imgUri, caption: 'one' } },
      { type: 'paragraph', content: [{ type: 'text', text: 'between' }] },
      { type: 'image', attrs: { src: img2 } },
      { type: 'image', attrs: { src: imgUri, width: 120 } },
      { type: 'image', attrs: { src: 'https://example.com/remote.png' } }
    ]
  }
  const dupFile: DocFile = { version: 1, title: 'Dup', lang: 'ko', theme: { ...defaultTheme, logoDataUrl: img2 }, tiptapDoc: dupDoc }
  const dupHtml = exportHtml(dupFile)
  const count = (h: string, x: string): number => h.split(x).length - 1
  const visibleImgs = count(dupHtml.slice(0, dupHtml.indexOf('id="docdev-data"')), b64)
  assert(count(dupHtml, b64) === visibleImgs, 'image bytes are not duplicated into the payload')
  const dupBack = extractPayload(dupHtml)!
  assert(dupBack.version === 1 && sameDoc(dupDoc, dupBack.tiptapDoc), 'image references resolve back to the exact images')
  assert(dupBack.theme.logoDataUrl === img2, 'logo image reference resolves')
  assert(dupBack.tiptapDoc.content![4].attrs!.src === 'https://example.com/remote.png', 'remote image URLs are kept as is')
}

import { writeFileSync } from 'node:fs'
writeFileSync('out/sample.html', html, 'utf-8')
writeFileSync('out/sample.doc', word, 'utf-8')
console.log('\nwrote out/sample.html (' + html.length + ' bytes)')

console.log('\nALL SMOKE TESTS PASSED')
