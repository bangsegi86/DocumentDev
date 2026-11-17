import { ipcMain, app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { IPC } from '../../shared/types'
import { allowPath } from '../docFiles'

/** Directory under userData where per-tab recovery snapshots are kept. */
function recoveryDir(): string {
  return join(app.getPath('userData'), 'recovery')
}

/** Remove all recovery snapshots (used when the user discards on close). */
export async function clearRecovery(): Promise<void> {
  await fs.rm(recoveryDir(), { recursive: true, force: true })
}
function fileFor(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(recoveryDir(), `${safe}.json`)
}

export function registerRecoveryHandlers(): void {
  ipcMain.handle(IPC.recoveryWrite, async (_e, id: string, json: string) => {
    await fs.mkdir(recoveryDir(), { recursive: true })
    await fs.writeFile(fileFor(id), json, 'utf8')
  })

  ipcMain.handle(IPC.recoveryDelete, async (_e, id: string) => {
    await fs.rm(fileFor(id), { force: true })
  })

  ipcMain.handle(IPC.recoveryList, async (): Promise<string[]> => {
    try {
      const files = await fs.readdir(recoveryDir())
      const out: string[] = []
      for (const f of files) {
        if (!f.endsWith('.json')) continue
        const json = await fs.readFile(join(recoveryDir(), f), 'utf8')
        // A recovered tab keeps saving to the file it came from.
        try {
          const p = (JSON.parse(json) as { filePath?: unknown }).filePath
          if (typeof p === 'string' && /\.html?$/i.test(p)) allowPath(p)
        } catch {
          /* unreadable snapshot: the renderer skips it too */
        }
        out.push(json)
      }
      return out
    } catch {
      return []
    }
  })

  ipcMain.handle(IPC.recoveryClear, async () => {
    await fs.rm(recoveryDir(), { recursive: true, force: true })
  })
}
