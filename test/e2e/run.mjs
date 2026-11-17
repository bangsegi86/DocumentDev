// End-to-end tests against the real built app (Electron), driven by Playwright.
//
//   npm run test:e2e        (builds first; on Linux without a display: xvfb-run -a npm run test:e2e)
//
// File dialogs are answered by the test (queued paths); everything else —
// IPC, saving, menus, PDF/Word export — is the real app.

import { _electron as electron } from 'playwright-core'
import electronPath from 'electron'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const mainJs = join(root, 'out/main/index.js')
const samplePath = join(root, 'sampleDoc/아성다이소 세종허브센터 Dipas Interface Doc.html')
if (!existsSync(mainJs)) {
  console.error('out/main/index.js is missing — run "npm run build" first (npm run test:e2e does it for you).')
  process.exit(1)
}

const work = mkdtempSync(join(tmpdir(), 'docdev-e2e-'))
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function docHtml(title, text) {
  const payload = { version: 1, title, lang: 'ko', theme: {}, tiptapDoc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } }
  return `<html><body><p>${text}</p><script id="docdev-data" type="application/json">${JSON.stringify(payload)}</script></body></html>`
}

// ---- tiny test runner -------------------------------------------------------
const results = []
let current = ''
function check(name, cond, detail = '') {
  results.push({ name: `${current} › ${name}`, ok: !!cond, detail })
  console.log(`  ${cond ? '✔' : '✘'} ${name}${cond || !detail ? '' : `  (${detail})`}`)
}
async function suite(name, fn) {
  current = name
  console.log(`\n${name}`)
  try {
    await fn()
  } catch (e) {
    check('no unexpected error', false, e instanceof Error ? e.stack : String(e))
  }
}

// ---- app helpers --------------------------------------------------------------
async function launch(extraArgs = [], userData = mkdtempSync(join(work, 'ud-'))) {
  const app = await electron.launch({
    executablePath: electronPath,
    args: [mainJs, '--no-sandbox', `--user-data-dir=${userData}`, ...extraArgs],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' }
  })
  const win = await app.firstWindow()
  await win.waitForSelector('.ProseMirror')
  // File dialogs answer from queues the test fills; empty queue = Cancel.
  await app.evaluate(({ dialog, shell }) => {
    globalThis.__open = []
    globalThis.__save = []
    globalThis.__opened = []
    dialog.showOpenDialog = async () => {
      const p = globalThis.__open.shift()
      return p ? { canceled: false, filePaths: [p] } : { canceled: true, filePaths: [] }
    }
    dialog.showSaveDialog = async () => {
      const p = globalThis.__save.shift()
      return p ? { canceled: false, filePath: p } : { canceled: true }
    }
    shell.openExternal = async (u) => {
      globalThis.__opened.push(u)
    }
  })
  return { app, win, userData }
}
const queueOpen = (app, p) => app.evaluate((_e, p) => globalThis.__open.push(p), p)
const queueSave = (app, p) => app.evaluate((_e, p) => globalThis.__save.push(p), p)
const text = (win) => win.evaluate(() => document.querySelector('.ProseMirror').innerText.trim())
const close = (app) => app.evaluate(({ app }) => app.exit(0)).catch(() => {})

async function openFile(app, win, path) {
  await queueOpen(app, path)
  await win.click('.bar-split .bar-icon-btn >> nth=0')
}
async function openSample(app, win) {
  await openFile(app, win, samplePath)
  await win.waitForFunction(() => document.querySelectorAll('.ProseMirror td').length > 1000, null, { timeout: 20000 })
}
async function exportMenu(win, label) {
  await win.click('.app-actions .bar-menu-host:not(.bar-split) .bar-btn')
  await win.click(`.bar-menu-item:has-text("${label}")`)
}
async function waitForFile(path, ms = 30000) {
  for (let t = 0; t < ms && !existsSync(path); t += 200) await new Promise((r) => setTimeout(r, 200))
  await new Promise((r) => setTimeout(r, 300))
  return existsSync(path)
}
async function insertTable(win) {
  await win.click('.toolbar button[title="표 삽입"]')
  await win.click('.grid-cell >> nth=18') // 3 × 3
}
async function paste(win, { html, text: plain, png }) {
  return win.evaluate(
    async ({ html, plain, png }) => {
      const dt = new DataTransfer()
      if (html) dt.setData('text/html', html)
      if (plain) dt.setData('text/plain', plain)
      if (png) dt.items.add(new File([Uint8Array.from(atob(png), (c) => c.charCodeAt(0))], 'a.png', { type: 'image/png' }))
      document.querySelector('.ProseMirror').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
      await new Promise((r) => setTimeout(r, 400))
    },
    { html, plain, png }
  )
}

// =============================================================================
const { app, win } = await launch()

await suite('표 붙여넣기 (엑셀처럼 표 + 그림이 함께 있는 클립보드)', async () => {
  await win.click('.ProseMirror')
  await insertTable(win)
  await win.click('.ProseMirror td >> nth=0')
  await paste(win, {
    html: '<table><tr><td>A1</td><td>B1</td></tr><tr><td>A2</td><td>B2</td></tr></table>',
    text: 'A1\tB1\nA2\tB2',
    png: PNG_1PX
  })
  const cells = await win.$$eval('.ProseMirror td', (tds) => tds.slice(0, 5).map((td) => (td.querySelector('img') ? '[IMG]' : td.textContent)))
  check('각 셀로 나뉘어 들어감', cells.join('|') === 'A1|B1||A2|B2', cells.join('|'))
})

await suite('그림 붙여넣기', async () => {
  await win.evaluate(() => window.api && null)
  await win.click('.ProseMirror p >> nth=-1').catch(() => win.click('.ProseMirror'))
  await paste(win, { png: PNG_1PX })
  check('스크린샷(그림만 있는 클립보드)은 파일 안에 내장', await win.evaluate(() => [...document.querySelectorAll('.ProseMirror img')].some((i) => i.src.startsWith('data:image/png;base64,'))))
  const shrunk = await win.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 4000
    c.height = 2000
    const g = c.getContext('2d')
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `hsl(${(i * 37) % 360},70%,50%)`
      g.fillRect((i * 97) % 4000, (i * 53) % 2000, 300, 200)
    }
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
    const dt = new DataTransfer()
    dt.items.add(new File([blob], 'big.png', { type: 'image/png' }))
    document.querySelector('.ProseMirror').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 1500))
    const img = [...document.querySelectorAll('.ProseMirror img')].pop()
    await img.decode()
    return img.naturalWidth
  })
  check('가로 1920px 넘는 그림은 자동 축소', shrunk === 1920, String(shrunk))
})

await suite('탭별 실행 취소', async () => {
  await win.evaluate(() => null)
  await win.click('.bar-icon-btn[aria-label="새 문서"]')
  await win.click('.ProseMirror')
  await win.keyboard.type('AAA')
  await win.waitForTimeout(600)
  await win.keyboard.type('BBB')
  await win.click('.bar-icon-btn[aria-label="새 문서"]')
  await win.click('.ProseMirror')
  await win.keyboard.type('CCC')
  const tabs = await win.$$('.tab')
  await tabs[tabs.length - 2].click()
  await win.click('.ProseMirror')
  await win.keyboard.press('Control+z')
  check('실행 취소 1번은 마지막 입력만 취소', (await text(win)) === 'AAA', await text(win))
  for (let i = 0; i < 5; i++) await win.keyboard.press('Control+z')
  check('계속 눌러도 다른 탭 내용이 들어오지 않음', !(await text(win)).includes('CCC'), await text(win))
  await (await win.$$('.tab')).pop().click()
  check('다른 탭 내용 유지', (await text(win)) === 'CCC', await text(win))

  await openSample(app, win)
  const before = (await text(win)).length
  await win.click('.ProseMirror h1 >> nth=0')
  await win.keyboard.press('Control+z')
  check('파일을 연 직후 실행 취소해도 내용 유지', (await text(win)).length === before)
  check('목차가 열린 문서로 갱신', (await win.$$('.doc-toc li')).length > 20)
})

await suite('찾기 / 바꾸기', async () => {
  await win.click('.bar-icon-btn[aria-label="새 문서"]')
  await win.click('.ProseMirror')
  await win.keyboard.type('Hello ')
  await win.keyboard.press('Control+b')
  await win.keyboard.type('world')
  await win.keyboard.press('Control+b')
  await win.click('.toolbar button[title^="찾기"]')
  await win.fill('.find-input >> nth=0', 'lo wo')
  check('굵게 경계를 넘는 문장도 찾음', (await win.textContent('.find-count')) === '1 / 1', await win.textContent('.find-count'))
  await win.fill('.find-input >> nth=1', 'LO-WO')
  await win.click('.find-btn-wide >> nth=1')
  check('경계를 넘는 바꾸기', (await text(win)).startsWith('HelLO-WOrld'), await text(win))
  await win.keyboard.press('Escape')
})

await suite('표 셀 병합 / 분할', async () => {
  await win.click('.ProseMirror')
  await win.keyboard.press('End')
  await win.keyboard.press('Enter')
  await insertTable(win)
  const rows = () => win.$$eval('.ProseMirror tr', (r) => r.map((x) => x.children.length))
  const a = await win.locator('.ProseMirror td').nth(0).boundingBox()
  const b = await win.locator('.ProseMirror td').nth(1).boundingBox()
  await win.mouse.move(a.x + 10, a.y + 10)
  await win.mouse.down()
  await win.mouse.move(b.x + 20, b.y + 10, { steps: 5 })
  await win.mouse.up()
  await win.mouse.click(b.x + 20, b.y + 10, { button: 'right' })
  await win.click('.ctx-action:has-text("셀 병합")')
  check('드래그 선택 → 오른쪽 클릭 → 병합', (await rows())[1] === 2, JSON.stringify(await rows()))
  await win.mouse.click(a.x + 10, a.y + 10, { button: 'right' })
  await win.click('.ctx-action:has-text("셀 분할")')
  check('병합된 셀 분할', (await rows())[1] === 3, JSON.stringify(await rows()))
})

await suite('끌어다 놓기 / 화면 이동 차단 / 외부 링크', async () => {
  const dropped = join(work, '드롭문서.html')
  writeFileSync(dropped, docHtml('드롭문서', '드롭된 내용'))
  const drop = (sel, name, type, content, b64) =>
    win.evaluate(
      ({ sel, name, type, content, b64 }) => {
        const dt = new DataTransfer()
        dt.items.add(new File([b64 ? Uint8Array.from(atob(content), (c) => c.charCodeAt(0)) : content], name, { type }))
        const el = document.querySelector(sel)
        const r = el.getBoundingClientRect()
        const ev = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.left + 10, clientY: r.top + 10 })
        el.dispatchEvent(ev)
        return ev.defaultPrevented
      },
      { sel, name, type, content, b64 }
    )
  const tabsBefore = (await win.$$('.tab')).length
  check('.html을 놓으면 새 탭으로 열림', (await drop('.doc-sidebar', '드롭문서.html', 'text/html', readFileSync(dropped, 'utf8'))) && (await win.waitForFunction((n) => document.querySelectorAll('.tab').length === n + 1, tabsBefore).then(() => true, () => false)))
  check('그림을 본문에 놓으면 삽입', (await drop('.ProseMirror p', 'x.png', 'image/png', PNG_1PX, true)) && (await win.waitForSelector('.ProseMirror img').then(() => true, () => false)))
  check('그 밖의 파일은 무시(화면 유지)', (await drop('.toolbar', 'x.zip', 'application/zip', 'zz')) && !!(await win.$('.ProseMirror')))

  await win.evaluate(() => {
    window.open('https://example.com/a')
    window.open('mailto:a@b.c')
    window.open('file:///etc/passwd')
    window.open('ms-settings:privacy')
  })
  await win.waitForTimeout(500)
  const opened = await app.evaluate(() => globalThis.__opened)
  check('외부 링크는 http/https/mailto만 열림', JSON.stringify(opened) === JSON.stringify(['https://example.com/a', 'mailto:a@b.c']), JSON.stringify(opened))
})

await suite('맞춤법 메뉴', async () => {
  const state = () =>
    app.evaluate(({ Menu }) => {
      const view = Menu.getApplicationMenu().items.find((i) => ['보기', 'View'].includes(i.label))
      return view.submenu.items.find((i) => i.type === 'checkbox').checked
    })
  await app.evaluate(({ Menu, BrowserWindow }) => {
    const view = Menu.getApplicationMenu().items.find((i) => ['보기', 'View'].includes(i.label))
    view.submenu.items.find((i) => i.type === 'checkbox').click(undefined, BrowserWindow.getAllWindows()[0])
  })
  await win.evaluate(() => window.api.setMenuLang('en'))
  await win.waitForTimeout(300)
  check('언어를 바꿔도 체크 유지', (await state()) === true)
  await win.evaluate(() => window.api.setMenuLang('ko'))
})

await suite('PDF / 워드 / 내보낸 HTML', async () => {
  await openSample(app, win)
  const pdf = join(work, 'out.pdf')
  await queueSave(app, pdf)
  await exportMenu(win, 'PDF')
  check('PDF 생성', (await waitForFile(pdf)) && readFileSync(pdf).subarray(0, 5).toString() === '%PDF-' && statSync(pdf).size > 50_000)

  const docx = join(work, 'out.docx')
  await queueSave(app, docx)
  await exportMenu(win, '워드')
  check('워드(.docx) 생성', (await waitForFile(docx)) && readFileSync(docx).subarray(0, 2).toString() === 'PK')

  const html = join(work, 'exported.html')
  await queueSave(app, html)
  await exportMenu(win, '다른 이름으로 저장')
  check('HTML 저장', await waitForFile(html))
  const viewer = await app.evaluate(async ({ BrowserWindow }, file) => {
    const w = new BrowserWindow({ show: false, width: 1200, height: 800 })
    await w.loadFile(file)
    return w.id
  }, html)
  const page = (await app.windows()).find((w) => w.url().endsWith('exported.html'))
  const visible = () => page.$$eval('.doc-toc li', (lis) => lis.filter((li) => li.style.display !== 'none').length)
  const all = await visible()
  await page.fill('#doc-toc-filter', 'Dipas to WMS')
  const some = await visible()
  check('내보낸 문서의 목차 검색', all > 20 && some > 0 && some < all, `${all} → ${some}`)
  await app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id)?.destroy(), viewer)
})

await suite('입력 반응 속도 (참고용)', async () => {
  await win.click('.ProseMirror td >> nth=200')
  const lat = []
  for (let i = 0; i < 30; i++) {
    lat.push(
      await win.evaluate(
        () =>
          new Promise((res) => {
            const s = performance.now()
            document.execCommand('insertText', false, 'x')
            requestAnimationFrame(() => setTimeout(() => res(performance.now() - s)))
          })
      )
    )
  }
  lat.sort((a, b) => a - b)
  console.log(`  · 샘플 문서에서 글자 하나 입력: 중간값 ${lat[15].toFixed(1)}ms, 최대 ${lat[29].toFixed(1)}ms`)
  check('중간값 50ms 미만', lat[15] < 50, lat[15].toFixed(1))
})
await suite('보안: 화면에서 고른 적 없는 경로는 쓰기·읽기 거부', async () => {
  const target = join(work, 'never-chosen.html')
  const res = await win.evaluate((p) => window.api.saveFile(p, 'x'), target)
  check('임의 경로 저장 거부', res.error === 'ENOTALLOWED' && !existsSync(target), JSON.stringify(res))
  const read = await win.evaluate(() => window.api.openRecent('/etc/hostname'))
  check('최근 목록에 없는 파일 읽기 거부', read.error === 'ENOTALLOWED' && read.contents === undefined, JSON.stringify(read))
})

// Last for this window: Playwright keeps waiting on a blocked navigation.
await suite('화면 이동 차단', async () => {
  const url = win.url()
  await win.evaluate(() => { location.href = 'file:///etc/hosts' }).catch(() => {})
  await new Promise((r) => setTimeout(r, 800))
  check('앱 화면이 다른 페이지로 이동하지 않음', win.url() === url && (await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getURL())) === url)
})
await close(app)

// ---- launched with a file / second instance / recent / external change ----
await suite('파일 열기 (명령줄 · 두 번째 실행 · 최근 문서 · 외부 변경)', async () => {
  const A = join(work, '문서A.html')
  const B = join(work, '문서B.html')
  writeFileSync(A, docHtml('문서A', 'A 본문'))
  writeFileSync(B, docHtml('문서B', 'B 본문'))
  const ud = mkdtempSync(join(work, 'ud-'))
  const { app: app2, win: w2 } = await launch([A], ud)
  await w2.waitForFunction(() => document.querySelector('.ProseMirror').innerText.includes('A 본문'), null, { timeout: 10000 }).catch(() => {})
  check('명령줄로 넘긴 파일이 열림', (await text(w2)).includes('A 본문'))

  const second = spawn(electronPath, [mainJs, '--no-sandbox', `--user-data-dir=${ud}`, B], { stdio: 'ignore' })
  const code = await new Promise((r) => second.on('exit', r))
  const two = await w2.waitForFunction(() => document.querySelectorAll('.tab').length === 2, null, { timeout: 10000 }).then(() => true, () => false)
  check('두 번째 실행은 기존 창에 탭으로 넘김', code === 0 && two && (await text(w2)).includes('B 본문'))

  await w2.click('.bar-split-caret')
  const names = await w2.$$eval('.bar-menu-file-name', (els) => els.map((e) => e.textContent))
  check('최근 문서 목록', JSON.stringify(names) === JSON.stringify(['문서B.html', '문서A.html']), JSON.stringify(names))
  await w2.click('.bar-menu-file >> nth=1')
  await w2.waitForTimeout(300)
  check('이미 열린 문서는 그 탭으로 이동', (await w2.$$('.tab')).length === 2 && (await text(w2)).includes('A 본문'))

  await w2.waitForTimeout(1200)
  writeFileSync(A, docHtml('문서A', '다른 프로그램이 바꾼 내용'))
  const future = new Date(Date.now() + 5000)
  utimesSync(A, future, future)
  await w2.click('.ProseMirror p')
  await w2.keyboard.press('End')
  await w2.keyboard.type(' 앱에서 수정')
  let asked = ''
  w2.once('dialog', (d) => {
    asked = d.message()
    void d.dismiss()
  })
  await w2.click('.bar-btn-primary')
  await w2.waitForTimeout(800)
  check('외부에서 바뀐 파일은 덮어쓰기 전에 확인', asked.includes('다른 프로그램') && readFileSync(A, 'utf8').includes('다른 프로그램이 바꾼 내용'))
  w2.once('dialog', (d) => void d.accept())
  await w2.click('.bar-btn-primary')
  await w2.waitForTimeout(800)
  check('확인하면 덮어씀', readFileSync(A, 'utf8').includes('앱에서 수정'))
  await close(app2)
})

// =============================================================================
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
for (const f of failed) console.log(`  ✘ ${f.name}${f.detail ? `\n    ${f.detail}` : ''}`)
try {
  // Electron may still be flushing its profile right after exit.
  rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
} catch {
  console.log(`(temp folder left behind: ${work})`)
}
process.exit(failed.length ? 1 : 0)
