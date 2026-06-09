import { dialog, BrowserWindow } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { extname } from 'path'
import { FILE_EXTENSION } from '../../shared/constants'
import type { OpenResult, SaveResult, ImageResult } from '../../shared/types'

const FILTERS = [{ name: 'HTML Document', extensions: [FILE_EXTENSION] }]

const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp'
}

export async function openImageDialog(win: BrowserWindow): Promise<ImageResult> {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Insert Image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] }],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return { canceled: true }
  const path = filePaths[0]
  const mime = IMAGE_MIME[extname(path).toLowerCase()] ?? 'application/octet-stream'
  const buf = await readFile(path)
  return { canceled: false, dataUri: `data:${mime};base64,${buf.toString('base64')}` }
}

export async function openFileDialog(win: BrowserWindow): Promise<OpenResult> {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Open Document',
    filters: FILTERS,
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return { canceled: true }
  const path = filePaths[0]
  const contents = await readFile(path, 'utf-8')
  return { canceled: false, path, contents }
}

export async function saveFile(path: string, contents: string): Promise<SaveResult> {
  await writeFile(path, contents, 'utf-8')
  return { canceled: false, path }
}

export async function saveFileAsDialog(
  win: BrowserWindow,
  suggestedName: string,
  contents: string
): Promise<SaveResult> {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save Document',
    defaultPath: suggestedName,
    filters: FILTERS
  })
  if (canceled || !filePath) return { canceled: true }
  await writeFile(filePath, contents, 'utf-8')
  return { canceled: false, path: filePath }
}

export async function saveWordDialog(
  win: BrowserWindow,
  suggestedName: string,
  contents: string
): Promise<SaveResult> {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Download as Word',
    defaultPath: suggestedName,
    filters: [{ name: 'Word Document', extensions: ['doc'] }]
  })
  if (canceled || !filePath) return { canceled: true }
  await writeFile(filePath, contents, 'utf-8')
  return { canceled: false, path: filePath }
}
