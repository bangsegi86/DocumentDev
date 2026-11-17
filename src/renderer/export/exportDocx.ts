import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  type IParagraphOptions,
  type IRunOptions,
  type ParagraphChild
} from 'docx'
import type { JSONContent } from '@tiptap/core'
import type { DocFile, ThemeSettings } from '@shared/types'
import { cssSafeTheme } from '../theme/themeToCss'
import { defaultTheme } from '../theme/defaultTheme'

/**
 * Build a real Word document (.docx) from the editor content.
 * Headings, lists, quotes, code, tables (header shading, cell colours,
 * merged cells, column widths), images (size, alignment, caption), links and
 * text colours map to native Word structures, styled from the document theme.
 */

// ---- Units & page -----------------------------------------------------------
const TWIP_PER_PX = 15 // 1px = 0.75pt = 15 twips
const PAGE_W = 11906 // A4 width in twips
const PAGE_H = 16838
const MARGIN = 1020 // 1.8 cm
const CONTENT_TWIPS = PAGE_W - 2 * MARGIN
const CONTENT_PX = Math.floor(CONTENT_TWIPS / TWIP_PER_PX)

// ---- Theme helpers ----------------------------------------------------------

/** CSS colour → Word hex ("1F3A5F"), or undefined if not a plain colour. */
export function wordColor(css: string | null | undefined): string | undefined {
  if (!css) return undefined
  const c = css.trim()
  let m = /^#([0-9a-f]{3})$/i.exec(c)
  if (m) return m[1].split('').map((ch) => ch + ch).join('').toUpperCase()
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(c)
  if (m) return m[1].toUpperCase()
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c)
  if (m) return [m[1], m[2], m[3]].map((n) => Math.min(255, +n).toString(16).padStart(2, '0')).join('').toUpperCase()
  return undefined
}

const GENERIC_FONTS = new Set(['-apple-system', 'blinkmacsystemfont', 'system-ui', 'sans-serif', 'serif', 'monospace', 'roboto'])
const KOREAN_FONTS = ['malgun gothic', '맑은 고딕', 'apple sd gothic neo', 'noto sans kr', 'nanumgothic', '나눔고딕']

/** Pick Word fonts from a CSS font stack: a Latin face and a Korean face. */
export function wordFonts(stack: string): { ascii: string; eastAsia: string; hAnsi: string } {
  const fams = stack.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
  const usable = fams.filter((f) => !GENERIC_FONTS.has(f.toLowerCase()))
  const korean = usable.find((f) => KOREAN_FONTS.includes(f.toLowerCase())) ?? 'Malgun Gothic'
  const latin = usable[0] ?? 'Segoe UI'
  return { ascii: latin, eastAsia: korean, hAnsi: latin }
}

/** CSS font size ("15px" / "11pt") → Word half-points. */
export function wordHalfPoints(size: string): number {
  const n = parseFloat(size)
  if (!Number.isFinite(n) || n <= 0) return 22
  const pt = /pt\s*$/i.test(size) ? n : n * 0.75
  return Math.max(12, Math.round(pt * 2))
}

// ---- Images -----------------------------------------------------------------

interface ImageBytes {
  type: 'png' | 'jpg' | 'gif' | 'bmp'
  data: Uint8Array
  width: number
  height: number
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Read pixel size from PNG / JPEG / GIF / BMP headers (no decoding needed). */
export function imageSize(type: ImageBytes['type'], b: Uint8Array): { width: number; height: number } | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  try {
    if (type === 'png') return { width: dv.getUint32(16), height: dv.getUint32(20) }
    if (type === 'gif') return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) }
    if (type === 'bmp') return { width: dv.getInt32(18, true), height: Math.abs(dv.getInt32(22, true)) }
    // JPEG: walk segments to the first SOFn marker.
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null
      const marker = b[i + 1]
      const len = dv.getUint16(i + 2)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: dv.getUint16(i + 7), height: dv.getUint16(i + 5) }
      }
      i += 2 + len
    }
  } catch {
    /* malformed header */
  }
  return null
}

/** Re-encode an image Word can't embed (WebP, SVG) as PNG — renderer only. */
async function toPngViaCanvas(src: string): Promise<string | null> {
  if (typeof document === 'undefined') return null
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || 800
    canvas.height = img.naturalHeight || 600
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

async function loadImage(src: string): Promise<ImageBytes | null> {
  let m = /^data:image\/([a-z+.-]+);base64,(.*)$/i.exec(src)
  if (!m) return null
  let kind = m[1].toLowerCase()
  if (kind === 'webp' || kind === 'svg+xml') {
    const png = await toPngViaCanvas(src)
    m = png ? /^data:image\/(png);base64,(.*)$/i.exec(png) : null
    if (!m) return null
    kind = 'png'
  }
  const type = kind === 'jpeg' || kind === 'jpg' ? 'jpg' : kind === 'png' || kind === 'gif' || kind === 'bmp' ? kind : null
  if (!type) return null
  const data = base64ToBytes(m[2])
  const size = imageSize(type, data)
  if (!size || size.width <= 0 || size.height <= 0) return null
  return { type, data, ...size }
}

// ---- Content conversion -----------------------------------------------------

type Block = Paragraph | Table

interface Ctx {
  theme: ThemeSettings
  /** Extra paragraph options (quotes indent, table cells drop spacing, …). */
  para: Partial<IParagraphOptions>
  /** Extra run options applied to all text (e.g. bold in header cells). */
  run: Partial<IRunOptions>
  /** Max image width here, in px. */
  maxImagePx: number
  orderedInstance: { n: number }
}

const SAFE_LINK = /^(https?:|mailto:)/i

function runOptions(node: JSONContent, ctx: Ctx): IRunOptions {
  const o: Record<string, unknown> = { ...ctx.run, text: node.text ?? '' }
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case 'bold':
        o.bold = true
        break
      case 'italic':
        o.italics = true
        break
      case 'strike':
        o.strike = true
        break
      case 'code':
        o.font = 'Consolas'
        o.shading = { type: ShadingType.CLEAR, fill: wordColor(ctx.theme.codeBlockBackground) ?? 'F3F4F6', color: 'auto' }
        break
      case 'textStyle': {
        const color = wordColor(mark.attrs?.color as string)
        if (color) o.color = color
        break
      }
    }
  }
  return o as IRunOptions
}

function inline(nodes: JSONContent[] | undefined, ctx: Ctx): ParagraphChild[] {
  const out: ParagraphChild[] = []
  for (const n of nodes ?? []) {
    if (n.type === 'hardBreak') {
      out.push(new TextRun({ break: 1 }))
    } else if (n.type === 'text') {
      const link = n.marks?.find((m) => m.type === 'link')
      const href = link?.attrs?.href as string | undefined
      if (href && SAFE_LINK.test(href)) {
        out.push(new ExternalHyperlink({ link: href, children: [new TextRun({ ...runOptions(n, ctx), style: 'Hyperlink' })] }))
      } else {
        out.push(new TextRun(runOptions(n, ctx)))
      }
    }
  }
  return out
}

function paragraph(children: ParagraphChild[], ctx: Ctx, extra: Partial<IParagraphOptions> = {}): Paragraph {
  return new Paragraph({ ...ctx.para, ...extra, children })
}

async function imageBlocks(node: JSONContent, ctx: Ctx): Promise<Block[]> {
  const a = node.attrs ?? {}
  const src = String(a.src ?? '')
  const align =
    a.align === 'center' ? AlignmentType.CENTER : a.align === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT
  const out: Block[] = []
  const img = await loadImage(src)
  if (img) {
    const want = typeof a.width === 'number' && a.width > 0 ? a.width : img.width
    const w = Math.min(want, ctx.maxImagePx)
    const h = Math.round((img.height * w) / img.width)
    out.push(
      paragraph(
        [
          new ImageRun({
            type: img.type,
            data: img.data,
            transformation: { width: w, height: h },
            altText: a.alt ? { name: 'image', description: String(a.alt), title: String(a.alt) } : undefined
          })
        ],
        ctx,
        { alignment: align, keepNext: !!a.caption }
      )
    )
  } else if (SAFE_LINK.test(src)) {
    // A web image can't be embedded offline — keep it reachable as a link.
    out.push(
      paragraph(
        [new ExternalHyperlink({ link: src, children: [new TextRun({ text: `[${a.alt || src}]`, style: 'Hyperlink' })] })],
        ctx,
        { alignment: align }
      )
    )
  }
  if (a.caption) {
    out.push(
      paragraph([new TextRun({ text: String(a.caption), italics: true, size: 18, color: '6B7280' })], ctx, {
        alignment: align,
        spacing: { before: 60, after: 200 }
      })
    )
  }
  return out
}

function codeBlock(node: JSONContent, ctx: Ctx): Table {
  const text = (node.content ?? []).map((n) => n.text ?? '').join('')
  const border = { style: BorderStyle.SINGLE, size: 4, color: wordColor(ctx.theme.tableBorderColor) ?? 'CBD5E1' }
  const lines = text.split('\n')
  return new Table({
    width: { size: CONTENT_TWIPS, type: WidthType.DXA },
    columnWidths: [CONTENT_TWIPS],
    layout: TableLayoutType.FIXED,
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: [
      new TableRow({
        cantSplit: false,
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: wordColor(ctx.theme.codeBlockBackground) ?? 'F5F6F8', color: 'auto' },
            margins: { top: 100, bottom: 100, left: 160, right: 160 },
            children: lines.map(
              (line) =>
                new Paragraph({
                  spacing: { before: 0, after: 0, line: 260 },
                  children: [new TextRun({ text: line, font: 'Consolas', size: 18 })]
                })
            )
          })
        ]
      })
    ]
  })
}

/** Rough display width of text: CJK / full-width characters count double. */
function textWidth(text: string): number {
  let w = 0
  for (const ch of text) w += /[\u1100-\u11ff\u2e80-\ua4cf\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/.test(ch) ? 2 : 1
  return w
}

function cellText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? ''
  return (node.content ?? []).map(cellText).join(node.type === 'tableCell' || node.type === 'tableHeader' ? '\n' : '')
}

/**
 * Column widths in twips. Widths the user set in the editor (colwidth) are
 * kept; other columns are sized by their content — the longest line in the
 * column, softened so one long cell doesn't take the whole page — and
 * everything is scaled to the page width.
 */
function columnWidths(table: JSONContent): number[] {
  const rows = table.content ?? []
  const firstRow = rows[0]?.content ?? []
  const cols: (number | null)[] = []
  for (const cell of firstRow) {
    const span = (cell.attrs?.colspan as number) || 1
    const cw = cell.attrs?.colwidth as number[] | null | undefined
    for (let k = 0; k < span; k++) cols.push(cw?.[k] ?? null)
  }
  if (cols.length === 0) return [CONTENT_TWIPS]

  // Content weight per column (single-span cells only), and a minimum width
  // that keeps each header word on one line (e.g. "NULL", "Len/Dec").
  const weight = cols.map(() => 3)
  const minPx = cols.map(() => 44)
  for (const row of rows) {
    let c = 0
    for (const cell of row.content ?? []) {
      const span = (cell.attrs?.colspan as number) || 1
      if (span === 1 && c < weight.length) {
        const longest = Math.max(0, ...cellText(cell).split('\n').map(textWidth))
        // Softened above 12 chars and capped, so one very long cell doesn't take
        // the whole page; headers count a little extra (bold).
        const w = longest <= 12 ? longest : 12 + Math.min(longest - 12, 48) * 0.7
        weight[c] = Math.max(weight[c], cell.type === 'tableHeader' ? w * 1.1 : w)
        if (cell.type === 'tableHeader') {
          const word = Math.max(0, ...cellText(cell).split(/\s+/).map(textWidth))
          minPx[c] = Math.max(minPx[c], Math.min(120, word * 7.5 + 20))
        }
      }
      c += span
    }
  }

  // Columns without a set width: share the free space by content weight, lift
  // any column below its header minimum, and take that overflow back only
  // from columns that still have room above their own minimum.
  const known = cols.reduce<number>((a, c) => a + (c ?? 0), 0)
  const unknownIdx = cols.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0)
  const available = Math.max(unknownIdx.length * 30, CONTENT_PX - known)
  const weightSum = unknownIdx.reduce((a, i) => a + weight[i], 0) || 1
  let px = cols.map((c, i) => c ?? Math.max(minPx[i], (available * weight[i]) / weightSum))
  const over = px.reduce((a, b) => a + b, 0) - CONTENT_PX
  if (over > 0 && unknownIdx.length > 0) {
    const room = unknownIdx.reduce((a, i) => a + Math.max(0, px[i] - minPx[i]), 0)
    if (room > 0) {
      const take = Math.min(over, room)
      px = px.map((w, i) => (cols[i] === null ? w - (take * Math.max(0, w - minPx[i])) / room : w))
    }
  }
  // User-set widths wider than the page: scale everything down to fit.
  const total = px.reduce((a, b) => a + b, 0)
  if (total > CONTENT_PX) px = px.map((w) => (w * CONTENT_PX) / total)
  return px.map((w) => Math.round(w * TWIP_PER_PX))
}

async function tableBlock(node: JSONContent, ctx: Ctx): Promise<Table> {
  const widths = columnWidths(node)
  const border = { style: BorderStyle.SINGLE, size: 4, color: wordColor(ctx.theme.tableBorderColor) ?? 'CBD5E1' }
  const headerFill = wordColor(ctx.theme.tableHeaderBackground)
  const rows: TableRow[] = []
  for (const row of node.content ?? []) {
    const cells: TableCell[] = []
    let col = 0
    const allHeader = (row.content ?? []).every((c) => c.type === 'tableHeader')
    for (const cell of row.content ?? []) {
      const span = (cell.attrs?.colspan as number) || 1
      const rowSpan = (cell.attrs?.rowspan as number) || 1
      const isHeader = cell.type === 'tableHeader'
      const fill = wordColor(cell.attrs?.backgroundColor as string) ?? (isHeader ? headerFill : undefined)
      const cellPx = widths.slice(col, col + span).reduce((a, b) => a + b, 0) / TWIP_PER_PX
      col += span
      const cellCtx: Ctx = {
        ...ctx,
        para: { spacing: { before: 0, after: 40 } },
        run: isHeader ? { ...ctx.run, bold: true } : ctx.run,
        maxImagePx: Math.max(40, cellPx - 14)
      }
      const children = await blocks(cell.content, cellCtx)
      cells.push(
        new TableCell({
          columnSpan: span > 1 ? span : undefined,
          rowSpan: rowSpan > 1 ? rowSpan : undefined,
          shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: children.length > 0 ? children : [new Paragraph({})]
        })
      )
    }
    rows.push(new TableRow({ children: cells, tableHeader: allHeader && rows.length === 0, cantSplit: true }))
  }
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows
  })
}

async function listBlocks(node: JSONContent, ctx: Ctx, level: number): Promise<Block[]> {
  const ordered = node.type === 'orderedList'
  const instance = ordered ? ++ctx.orderedInstance.n : 0
  const out: Block[] = []
  for (const item of node.content ?? []) {
    let first = true
    for (const child of item.content ?? []) {
      if (child.type === 'bulletList' || child.type === 'orderedList') {
        out.push(...(await listBlocks(child, ctx, Math.min(level + 1, 8))))
      } else if (first && (child.type === 'paragraph' || child.type === 'heading')) {
        out.push(
          paragraph(inline(child.content, ctx), ctx, {
            numbering: ordered
              ? { reference: 'docdev-ordered', level, instance }
              : { reference: 'docdev-bullet', level },
            spacing: { before: 0, after: 60 }
          })
        )
        first = false
      } else {
        // Follow-on blocks of the same item: indented to the item's text.
        const sub = await blocks([child], { ...ctx, para: { ...ctx.para, indent: { left: 720 * (level + 1) } } })
        out.push(...sub)
      }
    }
  }
  return out
}

async function blocks(nodes: JSONContent[] | undefined, ctx: Ctx): Promise<Block[]> {
  const out: Block[] = []
  for (const n of nodes ?? []) {
    switch (n.type) {
      case 'paragraph':
        out.push(paragraph(inline(n.content, ctx), ctx))
        break
      case 'heading': {
        const level = Math.min(3, Math.max(1, (n.attrs?.level as number) ?? 1))
        const heading = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][level - 1]
        out.push(paragraph(inline(n.content, ctx), ctx, { heading }))
        break
      }
      case 'bulletList':
      case 'orderedList':
        out.push(...(await listBlocks(n, ctx, 0)))
        break
      case 'blockquote': {
        const quoteBorder = { style: BorderStyle.SINGLE, size: 18, color: wordColor(ctx.theme.tableBorderColor) ?? 'CBD5E1', space: 10 }
        out.push(
          ...(await blocks(n.content, {
            ...ctx,
            para: { ...ctx.para, indent: { left: 240 }, border: { left: quoteBorder } },
            run: { ...ctx.run, color: '555555' }
          }))
        )
        break
      }
      case 'codeBlock':
        out.push(codeBlock(n, ctx), new Paragraph({ spacing: { after: 0 }, children: [] }))
        break
      case 'horizontalRule':
        out.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: wordColor(ctx.theme.tableBorderColor) ?? 'CBD5E1', space: 1 } },
            spacing: { after: 200 },
            children: []
          })
        )
        break
      case 'image':
        out.push(...(await imageBlocks(n, ctx)))
        break
      case 'table':
        out.push(await tableBlock(n, ctx), new Paragraph({ spacing: { after: 0 }, children: [] }))
        break
      default:
        if (n.content) out.push(...(await blocks(n.content, ctx)))
    }
  }
  return out
}

/** Word's built-in Heading 1-3 styles, restyled from the document theme
 *  (keeps them as real headings: navigation pane, outline, TOC). */
function headingStyle(level: 1 | 2 | 3, theme: ThemeSettings, basePt: number): object {
  const scale = [1.9, 1.45, 1.2][level - 1]
  return {
    run: {
      size: Math.round(basePt * scale * 2),
      bold: theme[`h${level}Bold` as const],
      italics: theme[`h${level}Italic` as const],
      color: wordColor(theme[`h${level}Color` as const]) ?? '2F5F8F'
    },
    paragraph: {
      spacing: { before: level === 1 ? 360 : 280, after: 120 },
      keepNext: true,
      border:
        level === 1
          ? { bottom: { style: BorderStyle.SINGLE, size: 4, color: wordColor(theme.tableBorderColor) ?? 'CBD5E1', space: 4 } }
          : undefined
    }
  }
}

/** Build the .docx file as bytes. */
export async function exportDocx(docFile: DocFile): Promise<Uint8Array> {
  // Files saved before a theme option existed lack it: fall back to defaults.
  const theme = cssSafeTheme({ ...defaultTheme, ...docFile.theme })
  const fonts = wordFonts(theme.bodyFont)
  const size = wordHalfPoints(theme.bodyFontSize)
  const basePt = size / 2
  const ctx: Ctx = { theme, para: {}, run: {}, maxImagePx: CONTENT_PX, orderedInstance: { n: 0 } }
  const title = docFile.title || theme.titleText

  const body = await blocks(docFile.tiptapDoc.content, ctx)
  const titleBar = new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: wordColor(theme.topBarColor) ?? '1F3A5F', color: 'auto' },
    spacing: { after: 240 },
    indent: { left: 0, right: 0 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 1, color: wordColor(theme.topBarColor) ?? '1F3A5F', space: 8 },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: wordColor(theme.topBarColor) ?? '1F3A5F', space: 8 }
    },
    children: [
      new TextRun({ text: ` ${title}`, bold: true, size: Math.round(basePt * 1.5 * 2), color: wordColor(theme.topBarTextColor) ?? 'FFFFFF' })
    ]
  })

  const bulletText = ['•', '◦', '▪']
  const orderedFormats = [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN]
  const levels = (ordered: boolean): object[] =>
    Array.from({ length: 9 }, (_, level) => ({
      level,
      format: ordered ? orderedFormats[level % 3] : LevelFormat.BULLET,
      text: ordered ? `%${level + 1}.` : bulletText[level % 3],
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 360 + 360 * level, hanging: 280 } } }
    }))

  const doc = new Document({
    creator: 'DocumentDev',
    title,
    styles: {
      default: {
        document: {
          run: { font: fonts, size, color: wordColor(theme.bodyTextColor) ?? '1F2937' },
          paragraph: { spacing: { after: 120, line: 300 } }
        },
        heading1: headingStyle(1, theme, basePt) as never,
        heading2: headingStyle(2, theme, basePt) as never,
        heading3: headingStyle(3, theme, basePt) as never
      },
      characterStyles: [
        {
          id: 'Hyperlink',
          name: 'Hyperlink',
          basedOn: 'DefaultParagraphFont',
          run: { color: wordColor(theme.linkColor) ?? '2563EB', underline: {} }
        }
      ]
    },
    numbering: {
      config: [
        { reference: 'docdev-bullet', levels: levels(false) as never },
        { reference: 'docdev-ordered', levels: levels(true) as never }
      ]
    },
    sections: [
      {
        properties: {
          page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } }
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '8A93A2' }),
                  new TextRun({ text: ' / ', size: 16, color: '8A93A2' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '8A93A2' })
                ]
              })
            ]
          })
        },
        children: [titleBar, ...body]
      }
    ]
  })
  return new Uint8Array(await Packer.toArrayBuffer(doc))
}
