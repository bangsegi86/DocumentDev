import { app } from 'electron'
import { promises as fs } from 'fs'
import { join, resolve } from 'path'
import type { OpenResult, SaveResult } from '../shared/types'

// ---------------------------------------------------------------------------
// Reading / writing documents, with
//  - a "recent documents" list (persisted in userData, also fed to the OS
//    jump list / dock menu), and
//  - external-change detection: the modification time seen when a file was
//    opened or last saved is remembered, and a save is refused (conflict)
//    if the file was changed on disk by something else since then.
// ---------------------------------------------------------------------------

const MAX_RECENT = 10
let recent: string[] | null = null
const knownMtime = new Map<string, number>()
const listeners = new Set<() => void>()

function recentFile(): string {
  return join(app.getPath('userData'), 'recent.json')
}

async function loadRecent(): Promise<string[]> {
  if (recent) return recent
  try {
    const parsed = JSON.parse(await fs.readFile(recentFile(), 'utf8'))
    recent = Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    recent = []
  }
  return recent
}

async function storeRecent(list: string[]): Promise<void> {
  recent = list.slice(0, MAX_RECENT)
  try {
    await fs.mkdir(app.getPath('userData'), { recursive: true })
    await fs.writeFile(recentFile(), JSON.stringify(recent), 'utf8')
  } catch {
    /* non-fatal: the list just won't survive a restart */
  }
  listeners.forEach((fn) => fn())
}

/** Most recently used document paths, newest first. */
export async function getRecent(): Promise<string[]> {
  return [...(await loadRecent())]
}

/** Call `fn` whenever the recent list changes (e.g. to rebuild the menu). */
export function onRecentChange(fn: () => void): void {
  listeners.add(fn)
}

export async function addRecent(path: string): Promise<void> {
  const abs = resolve(path)
  const list = (await loadRecent()).filter((p) => p !== abs)
  list.unshift(abs)
  if (process.platform === 'win32' || process.platform === 'darwin') app.addRecentDocument(abs)
  await storeRecent(list)
}

export async function removeRecent(path: string): Promise<void> {
  const abs = resolve(path)
  await storeRecent((await loadRecent()).filter((p) => p !== abs))
}

export async function clearRecent(): Promise<void> {
  if (process.platform === 'win32' || process.platform === 'darwin') app.clearRecentDocuments()
  await storeRecent([])
}

async function mtimeOf(path: string): Promise<number | null> {
  try {
    return (await fs.stat(path)).mtimeMs
  } catch {
    return null
  }
}

/** Read a document from disk and remember it as recent. */
export async function readDocument(path: string): Promise<OpenResult> {
  const abs = resolve(path)
  try {
    const contents = await fs.readFile(abs, 'utf8')
    const m = await mtimeOf(abs)
    if (m !== null) knownMtime.set(abs, m)
    await addRecent(abs)
    return { canceled: false, path: abs, contents }
  } catch (e) {
    await removeRecent(abs)
    return { canceled: false, path: abs, error: (e as NodeJS.ErrnoException).code ?? 'EREAD' }
  }
}

/**
 * Write a document. Unless `force`, refuses with `conflict: true` when the
 * file changed on disk since this app last read or wrote it.
 */
export async function writeDocument(path: string, contents: string, force = false): Promise<SaveResult> {
  const abs = resolve(path)
  const known = knownMtime.get(abs)
  if (!force && known !== undefined) {
    const now = await mtimeOf(abs)
    // 1s tolerance: some file systems round modification times.
    if (now !== null && now > known + 1000) return { canceled: true, path: abs, conflict: true }
  }
  await fs.writeFile(abs, contents, 'utf8')
  const m = await mtimeOf(abs)
  if (m !== null) knownMtime.set(abs, m)
  await addRecent(abs)
  return { canceled: false, path: abs }
}

/** Document paths passed on the command line ("Open with", drag onto the exe). */
export function documentArgs(argv: string[]): string[] {
  return argv.slice(1).filter((a) => !a.startsWith('-') && /\.html?$/i.test(a))
}
