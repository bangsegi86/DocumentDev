import { Menu, BrowserWindow, app } from 'electron'
import { IPC, type Lang, type MenuAction } from '../shared/types'
import { getRecent, clearRecent } from './docFiles'
import { openInApp } from './openQueue'

type Labels = Record<string, string>

const STRINGS: Record<Lang, Labels> = {
  ko: {
    file: '파일',
    new: '새 문서',
    open: '열기…',
    save: '저장',
    saveAs: '다른 이름으로 저장…',
    exportWord: '워드로 내려받기…',
    exportPdf: 'PDF로 내보내기…',
    print: '인쇄…',
    recent: '최근 문서',
    noRecent: '최근 문서 없음',
    clearRecent: '목록 지우기',
    quit: '종료',
    view: '보기',
    spellcheck: '맞춤법 검사',
    toggleLang: '언어 전환 (한/영)',
    reload: '새로고침',
    devtools: '개발자 도구',
    edit: '편집',
    undo: '실행 취소',
    redo: '다시 실행',
    cut: '잘라내기',
    copy: '복사',
    paste: '붙여넣기',
    selectAll: '모두 선택',
    find: '찾기…'
  },
  en: {
    file: 'File',
    new: 'New',
    open: 'Open…',
    save: 'Save',
    saveAs: 'Save As…',
    exportWord: 'Download as Word…',
    exportPdf: 'Export as PDF…',
    print: 'Print…',
    recent: 'Open Recent',
    noRecent: 'No recent documents',
    clearRecent: 'Clear Menu',
    quit: 'Quit',
    view: 'View',
    spellcheck: 'Spell Check',
    toggleLang: 'Toggle Language (KO/EN)',
    reload: 'Reload',
    devtools: 'Developer Tools',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    find: 'Find…'
  }
}

// Remembered here because the menu is rebuilt (e.g. on a language switch),
// which would otherwise reset the checkbox while spellcheck stays on.
let spellcheckOn = false

function send(action: MenuAction): void {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  win?.webContents.send(IPC.menuAction, action)
}

let currentLang: Lang = 'ko'

/** Switch the menu language (rebuilds the menu). */
export function setMenuLang(lang: Lang): void {
  currentLang = lang
  void buildMenu()
}

/** (Re)build the application menu, including the current recent-documents list. */
export async function buildMenu(): Promise<void> {
  const t = STRINGS[currentLang]
  const isMac = process.platform === 'darwin'
  const recent = await getRecent()
  const recentItems: Electron.MenuItemConstructorOptions[] =
    recent.length === 0
      ? [{ label: t.noRecent, enabled: false }]
      : [
          ...recent.map((p) => ({ label: p, click: () => openInApp(p) })),
          { type: 'separator' as const },
          { label: t.clearRecent, click: () => void clearRecent() }
        ]

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: t.file,
      submenu: [
        { label: t.new, accelerator: 'CmdOrCtrl+N', click: () => send('new') },
        { label: t.open, accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        { label: t.recent, submenu: recentItems },
        { type: 'separator' },
        { label: t.save, accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: t.saveAs, accelerator: 'CmdOrCtrl+Shift+S', click: () => send('saveAs') },
        { type: 'separator' },
        { label: t.exportPdf, accelerator: 'CmdOrCtrl+Shift+E', click: () => send('exportPdf') },
        { label: t.exportWord, accelerator: 'CmdOrCtrl+Shift+W', click: () => send('exportWord') },
        { type: 'separator' },
        { label: t.print, accelerator: 'CmdOrCtrl+P', click: () => send('print') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { label: t.quit, role: 'quit' }
      ]
    },
    {
      label: t.edit,
      submenu: [
        { label: t.undo, role: 'undo' },
        { label: t.redo, role: 'redo' },
        { type: 'separator' },
        { label: t.cut, role: 'cut' },
        { label: t.copy, role: 'copy' },
        { label: t.paste, role: 'paste' },
        { label: t.selectAll, role: 'selectAll' },
        { type: 'separator' },
        { label: t.find, accelerator: 'CmdOrCtrl+F', click: () => send('find') }
      ]
    },
    {
      label: t.view,
      submenu: [
        {
          label: t.spellcheck,
          type: 'checkbox',
          checked: spellcheckOn,
          click: (item) => {
            spellcheckOn = item.checked
            send('toggleSpellcheck')
          }
        },
        { type: 'separator' },
        { label: t.toggleLang, click: () => send('toggleLang') },
        { type: 'separator' },
        { label: t.reload, role: 'reload' },
        { label: t.devtools, role: 'toggleDevTools' }
      ]
    }
  ]

  if (isMac) {
    template.unshift({
      label: app.name,
      submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }]
    })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
