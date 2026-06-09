import { dialog, BrowserWindow } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { FILE_EXTENSION } from '../../shared/constants'
import type { OpenResult, SaveResult } from '../../shared/types'

const FILTERS = [{ name: 'HTML Document', extensions: [FILE_EXTENSION] }]

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
