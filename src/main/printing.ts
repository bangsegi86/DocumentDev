import { BrowserWindow, dialog, app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { Lang, SaveResult } from '../shared/types'

/**
 * Lay the exported document out in a hidden window (the document's own
 * @media print rules turn the 3-pane page into one flowing column), with
 * JavaScript disabled so nothing in the document can run. Header rows of
 * tables are moved into <thead> so they repeat on every printed page.
 */
async function withPrintWindow<T>(html: string, run: (win: BrowserWindow) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(join(app.getPath('temp'), 'docdev-print-'))
  const file = join(dir, 'document.html')
  await fs.writeFile(file, html, 'utf8')
  const win = new BrowserWindow({
    show: false,
    webPreferences: { javascript: false, sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  try {
    await win.loadFile(file)
    // JavaScript is off for the page itself; this runs in an isolated world.
    await win.webContents.executeJavaScriptInIsolatedWorld(1, [
      {
        code: `
          for (const table of document.querySelectorAll('.doc-content table')) {
            const body = table.tBodies[0]
            const first = body && body.rows[0]
            if (!first || table.tHead) continue
            if (![...first.cells].every((c) => c.tagName === 'TH')) continue
            table.createTHead().appendChild(first)
          }
          true
        `
      }
    ])
    return await run(win)
  } finally {
    win.destroy()
    await fs.rm(dir, { recursive: true, force: true })
  }
}

/** Ask where to save, then write the document as an A4 PDF. */
export async function exportPdf(
  parent: BrowserWindow,
  suggestedName: string,
  html: string,
  lang: Lang
): Promise<SaveResult> {
  const { canceled, filePath } = await dialog.showSaveDialog(parent, {
    title: lang === 'ko' ? 'PDF로 내보내기' : 'Export as PDF',
    defaultPath: suggestedName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (canceled || !filePath) return { canceled: true }
  const pdf = await withPrintWindow(html, (win) =>
    win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      generateDocumentOutline: true
    })
  )
  await fs.writeFile(filePath, pdf)
  return { canceled: false, path: filePath }
}

/** Open the system print dialog for the document. */
export async function printDocument(html: string): Promise<boolean> {
  return withPrintWindow(
    html,
    (win) =>
      new Promise<boolean>((resolve) => {
        win.webContents.print({ printBackground: true }, (success) => resolve(success))
      })
  )
}
