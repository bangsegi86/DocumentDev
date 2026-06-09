import { Menu, BrowserWindow, app } from 'electron'
import { IPC, type Lang, type MenuAction } from '../shared/types'

type Labels = Record<string, string>

const STRINGS: Record<Lang, Labels> = {
  ko: {
    file: '파일',
    new: '새 문서',
    open: '열기…',
    save: '저장',
    saveAs: '다른 이름으로 저장…',
    exportWord: '워드로 내려받기…',
    quit: '종료',
    view: '보기',
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
    quit: 'Quit',
    view: 'View',
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

function send(action: MenuAction): void {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  win?.webContents.send(IPC.menuAction, action)
}

export function buildMenu(lang: Lang): void {
  const t = STRINGS[lang]
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: t.file,
      submenu: [
        { label: t.new, accelerator: 'CmdOrCtrl+N', click: () => send('new') },
        { label: t.open, accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        { type: 'separator' },
        { label: t.save, accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: t.saveAs, accelerator: 'CmdOrCtrl+Shift+S', click: () => send('saveAs') },
        { type: 'separator' },
        { label: t.exportWord, accelerator: 'CmdOrCtrl+Shift+W', click: () => send('exportWord') },
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
