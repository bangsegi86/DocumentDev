import { exportHtml } from '../src/renderer/export/exportHtml'
import { exportDocx } from '../src/renderer/export/exportDocx'
import JSZip from 'jszip'
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

// Prototype keys in a received file's payload are dropped on load.
{
  const evilJson = '{"version":1,"title":"x","lang":"ko","theme":{},"tiptapDoc":{"type":"doc","content":[{"type":"paragraph","attrs":{"__proto__":{"onerror":"alert(1)"},"constructor":{"x":1}},"content":[{"type":"text","text":"hi"}]}]}}'
  const evilFile = '<html><script id="docdev-data" type="application/json">' + evilJson + '</script></html>'
  const parsed = extractPayload(evilFile)!
  const attrs = parsed.tiptapDoc.content![0].attrs as Record<string, unknown>
  assert(!!parsed && !Object.prototype.hasOwnProperty.call(attrs, '__proto__') && !Object.prototype.hasOwnProperty.call(attrs, 'constructor'), 'payload: __proto__ / constructor keys are stripped on load')
  assert((attrs as { onerror?: unknown }).onerror === undefined, 'payload: no polluted attributes reach the editor')
}

import { writeFileSync } from 'node:fs'
writeFileSync('out/sample.html', html, 'utf-8')
console.log('\nwrote out/sample.html (' + html.length + ' bytes)')

// ---- Word (.docx) export: a real OOXML package (async) ----
async function docxParts(file: DocFile): Promise<{ zip: JSZip; doc: string; styles: string; bytes: Uint8Array }> {
  const bytes = await exportDocx(file)
  const zip = await JSZip.loadAsync(bytes)
  return { zip, bytes, doc: await zip.file('word/document.xml')!.async('string'), styles: await zip.file('word/styles.xml')!.async('string') }
}

async function wordTests(): Promise<void> {
  console.log('== Word (.docx) export ==')
  const basic = await docxParts(docFile)
  assert(basic.bytes[0] === 0x50 && basic.bytes[1] === 0x4b, 'docx is a ZIP package')
  assert(basic.doc.includes('RMS Interface Doc') && basic.doc.includes('Content-Type'), 'title and table text present')
  assert(/<w:tbl>/.test(basic.doc) && /<w:tblHeader\/>/.test(basic.doc), 'table exported with repeating header row')
  assert(/<w:pStyle w:val="Heading1"\/>/.test(basic.doc), 'headings use Word heading styles (navigation pane / TOC)')

  const head = await docxParts({ version: 1, title: 'H', lang: 'ko', theme: headTheme, tiptapDoc: doc })
  const styleOf = (id: string): string => {
    const m = new RegExp(`<w:style[^>]*w:styleId="${id}"[\\s\\S]*?</w:style>`).exec(head.styles)
    return m ? m[0] : ''
  }
  assert(/w:color w:val="112233"/.test(styleOf('Heading1')), 'h1 custom color in Word export')
  assert(/<w:i\/>|<w:i w:val="true"\/>/.test(styleOf('Heading2')), 'h2 italic in Word export')
  assert(/<w:b w:val="false"\/>/.test(styleOf('Heading3')) || !/<w:b\/>/.test(styleOf('Heading3')), 'h3 bold-off in Word export')
  assert(/w:eastAsia="Malgun Gothic"/.test(head.styles), 'Korean text gets a Korean font')

  const styled = await docxParts(styledFile)
  assert(/w:fill="FFFF00"/.test(styled.doc), 'cell background renders in Word export')
  assert(/<w:color w:val="FF0000"\/>/.test(styled.doc), 'text color renders in Word export')

  const img = await docxParts(imgFile)
  const media = Object.keys(img.zip.files).filter((f) => f.startsWith('word/media/') && !f.endsWith('/'))
  assert(media.length === 1, 'image embedded in Word export')
  assert(/<w:jc w:val="center"\/>[\s\S]*?<w:drawing>/.test(img.doc), 'centered image is centered in Word')

  const evilDoc = await docxParts(evil)
  assert(!/<script/i.test(evilDoc.styles + evilDoc.doc), 'tampered theme values cannot inject markup into Word export')

  writeFileSync('out/sample.docx', basic.bytes)

  // Full-size artifacts for manual/visual review (out/ is not committed).
  const real = extractPayload(readFileSync('sampleDoc/아성다이소 세종허브센터 Dipas Interface Doc.html', 'utf8'))!
  writeFileSync('out/sample-real.docx', await exportDocx(real))
  const rich: DocFile = {
    version: 1,
    title: '기능 점검 문서',
    lang: 'ko',
    theme: defaultTheme,
    tiptapDoc: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '1. 개요' }] },
        { type: 'paragraph', content: [
          { type: 'text', text: '굵게 ', marks: [{ type: 'bold' }] },
          { type: 'text', text: '기울임 ', marks: [{ type: 'italic' }] },
          { type: 'text', text: '빨간 글자 ', marks: [{ type: 'textStyle', attrs: { color: '#dc2626' } }] },
          { type: 'text', text: 'inlineCode()', marks: [{ type: 'code' }] },
          { type: 'text', text: ' 그리고 ' },
          { type: 'text', text: '링크', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] }
        ] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1.1 목록' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '첫 항목' }] },
            { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '하위 항목' }] }] }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '둘째 항목' }] }] }
        ] },
        { type: 'orderedList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '순서 1' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '순서 2' }] }] }
        ] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '인용과 코드' }] },
        { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: '인용문: 기본 정보' }] }] },
        { type: 'codeBlock', attrs: { language: 'json' }, content: [{ type: 'text', text: '{\n  "id": 1,\n  "name": "DPS"\n}' }] },
        { type: 'horizontalRule' },
        { type: 'table', content: [
          { type: 'tableRow', content: [
            { type: 'tableHeader', attrs: { colwidth: [68] }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '번호' }] }] },
            { type: 'tableHeader', attrs: { colspan: 2 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '병합된 머리글' }] }] }
          ] },
          { type: 'tableRow', content: [
            { type: 'tableCell', attrs: { rowspan: 2, colwidth: [68] }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }] },
            { type: 'tableCell', attrs: { backgroundColor: '#fef9c3' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '노란 셀' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] }
          ] },
          { type: 'tableRow', content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'C' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'D' }] }] }
          ] }
        ] },
        { type: 'image', attrs: { src: `data:image/png;base64,${b64}`, width: 120, align: 'center', caption: '그림 1. 캡션' } }
      ]
    }
  }
  writeFileSync('out/sample-rich.docx', await exportDocx(rich))
}

wordTests()
  .then(() => console.log('\nALL SMOKE TESTS PASSED'))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
