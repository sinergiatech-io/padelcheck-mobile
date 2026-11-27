// KAN-78 Android driver (local QA only). Usage: node drv.mjs steps.json
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
const ADB = 'D:\\Android\\Sdk\\platform-tools\\adb.exe', S = ['-s', 'emulator-5554']
const OUT = process.env.SHOTS ?? 'C:\\Users\\Nicky\\kan78-android'
const PSQL = 'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe'
fs.mkdirSync(OUT, { recursive: true })
const adb = (...a) => execFileSync(ADB, [...S, ...a], { maxBuffer: 64 << 20, timeout: 60000 })
const sh = cmd => adb('shell', cmd).toString()
const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = (...a) => console.log(...a)
function dump() {
  for (let i = 0; i < 3; i++) {
    try {
      sh('uiautomator dump /sdcard/kan78-ui.xml >/dev/null')
      const xml = adb('exec-out', 'cat', '/sdcard/kan78-ui.xml').toString()
      const nodes = []
      for (const m of xml.matchAll(/<node ([^>]*?)\/?>/g)) {
        const a = Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(x => [x[1], x[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#10;/g, ' ')]))
        const b = a.bounds.match(/\d+/g).map(Number)
        nodes.push({ text: a.text, desc: a['content-desc'], cls: a.class.split('.').pop(), click: a.clickable === 'true', en: a.enabled === 'true', chk: a.checked === 'true', foc: a.focused === 'true', b, cx: (b[0] + b[2]) >> 1, cy: (b[1] + b[3]) >> 1 })
      }
      return nodes
    } catch (e) { if (i === 2) throw e }
  }
}
function find(nodes, re, idx = 0) {
  const r = new RegExp(re, 'i')
  const hits = nodes.filter(n => (n.text && r.test(n.text)) || (n.desc && r.test(n.desc)))
  return hits[idx < 0 ? hits.length + idx : idx]
}
function ui(nodes) {
  const lines = []
  for (const n of nodes) {
    const label = [n.text, n.desc && n.desc !== n.text ? '{' + n.desc + '}' : ''].filter(Boolean).join(' ')
    if (!label) continue
    lines.push(`${label.slice(0, 90)} [${n.cls}${n.click ? ',c' : ''}${n.en ? '' : ',DIS'}${n.chk ? ',CHK' : ''}${n.foc ? ',FOC' : ''}] @${n.cx},${n.cy}`)
  }
  log('UI> ' + lines.join('\nUI> '))
}
async function waitFor(re, ms = 15000, gone = false) {
  const t = Date.now()
  while (Date.now() - t < ms) { const n = find(dump(), re); if (gone ? !n : n) return n; await sleep(400) }
  throw new Error((gone ? 'still visible: ' : 'not found: ') + re)
}
async function login(email) {
  const r = await fetch('http://127.0.0.1:8178/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Kan78-local-only' }) })
  const j = await r.json(); return j.accessToken ?? j.token ?? j.access_token
}
const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
let failed = false
for (const [op, ...a] of steps) {
  try {
    if (op === 'tap') { const n = find(dump(), a[0], a[1] ?? 0); if (!n) throw new Error('no match ' + a[0]); sh(`input tap ${n.cx} ${n.cy}`); log(`tap ${a[0]} @${n.cx},${n.cy}${n.en ? '' : ' (disabled)'}`) }
    else if (op === 'tapxy') { sh(`input tap ${a[0]} ${a[1]}`); log('tapxy', a[0], a[1]) }
    else if (op === 'type') { sh(`input text '${String(a[0]).replace(/ /g, '%s')}'`); log('type', a[0]) }
    else if (op === 'clear') { const n = find(dump(), a[0]); sh(`input tap ${n.cx} ${n.cy}`); await sleep(300); sh('input keyevent KEYCODE_MOVE_END'); sh('input keyevent ' + Array(40).fill('KEYCODE_DEL').join(' ')); log('clear', a[0]) }
    else if (op === 'fill') { const n = find(dump(), a[0]); if (!n) throw new Error('no field ' + a[0]); sh(`input tap ${n.cx} ${n.cy}`); await sleep(300); sh('input keyevent KEYCODE_MOVE_END'); sh('input keyevent ' + Array(40).fill('KEYCODE_DEL').join(' ')); sh(`input text '${String(a[1]).replace(/ /g, '%s')}'`); log('fill', a[0], a[1]) }
    else if (op === 'key') { sh('input keyevent KEYCODE_' + a[0]); log('key', a[0]) }
    else if (op === 'swipe') { sh(`input swipe ${a.join(' ')}`); log('swipe', a.join(' ')) }
    else if (op === 'scrollto') { let n; for (let i = 0; i < (a[1] ?? 10) && !(n = find(dump(), a[0])); i++) sh('input swipe 540 1700 540 900 400'); if (!n) throw new Error('scrollto fail ' + a[0]); log('visible', a[0], '@' + n.cy) }
    else if (op === 'scrollup') { for (let i = 0; i < (a[0] ?? 6); i++) sh('input swipe 540 700 540 1800 300'); log('scrollup') }
    else if (op === 'wait') { const n = await waitFor(a[0], a[1] ?? 15000); log('saw', a[0]) }
    else if (op === 'gone') { await waitFor(a[0], a[1] ?? 15000, true); log('gone', a[0]) }
    else if (op === 'sleep') await sleep(a[0])
    else if (op === 'shot') { const p = path.join(OUT, a[0] + '.png'); fs.writeFileSync(p, adb('exec-out', 'screencap', '-p')); log('shot', p) }
    else if (op === 'ui') ui(dump())
    else if (op === 'assert') { const n = find(dump(), a[0]); if (!n) throw new Error('ASSERT missing ' + a[0]); log('ASSERT ok', a[0], n.en ? '' : '(disabled)') }
    else if (op === 'assertDisabled') { const n = find(dump(), a[0]); if (!n || n.en) throw new Error('ASSERT not disabled ' + a[0]); log('ASSERT disabled', a[0]) }
    else if (op === 'assertNot') { if (find(dump(), a[0])) throw new Error('ASSERT present ' + a[0]); log('ASSERT absent', a[0]) }
    else if (op === 'mode') { log('mode', await (await fetch('http://127.0.0.1:8179/__mode?set=' + a[0])).text()) }
    else if (op === 'sql') { log('SQL> ' + execFileSync(PSQL, ['-h', '127.0.0.1', '-p', '55478', '-U', 'postgres', '-d', 'padelcheck_kan78', '-w', '-tAc', a[0]]).toString().trim().replace(/\n/g, '\nSQL> ')) }
    else if (op === 'api') { const t = await login(a[1] ?? 'admin@kan78.test'); const r = await fetch('http://127.0.0.1:8178/api' + a[0], { headers: { Authorization: 'Bearer ' + t } }); log('API ' + r.status + ' ' + (await r.text()).slice(0, a[2] ?? 1500)) }
    else if (op === 'proxylog') { const l = fs.readFileSync('D:\\Code\\PadelCheck\\worktrees\\kan78-run\\fault-proxy.log', 'utf8').trim().split('\n'); log('PROXY> ' + l.slice(-(a[0] ?? 15)).join('\nPROXY> ')) }
    else if (op === 'mark') { fs.appendFileSync('D:\\Code\\PadelCheck\\worktrees\\kan78-run\\fault-proxy.log', new Date().toISOString() + ' ==== ' + a[0] + '\n'); log('mark', a[0]) }
    else if (op === 'adb') log(sh(a[0]))
    else throw new Error('unknown op ' + op)
  } catch (e) { log('FAIL', op, JSON.stringify(a), e.message); failed = true; try { ui(dump()) } catch {} ; break }
}
if (!failed && steps.at(-1)?.[0] !== 'ui') ui(dump())
