// Local test proxy: forwards to the real service, logs every request and can inject faults.
import http from 'node:http'
import fs from 'node:fs'
// Usage: SERVICE_PORT=8178 PROXY_PORT=8179 node fault-proxy.mjs ; modes: GET /__mode?set=slow,fail-hub,lose-draft,slow-write (empty = off)
const TARGET = { host: '127.0.0.1', port: Number(process.env.SERVICE_PORT ?? 8178) }
const LOG = process.env.PROXY_LOG ?? 'fault-proxy.log'
let modes = new Set()
const log = line => fs.appendFileSync(LOG, new Date().toISOString() + ' ' + line + '\n')
http.createServer((req, res) => {
  if (req.url.startsWith('/__mode')) {
    const value = new URL(req.url, 'http://x').searchParams.get('set') ?? ''
    modes = new Set(value.split(',').filter(Boolean)); log('MODE ' + [...modes].join(','))
    res.end('ok ' + [...modes].join(',')); return
  }
  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', () => {
    const body = Buffer.concat(chunks)
    const path = req.url.split('?')[0]
    const isDivisionsGet = req.method === 'GET' && /\/events\/[^/]+\/divisions$/.test(path)
    const isDetailGet = req.method === 'GET' && /\/clubs\/[^/]+\/events\/[0-9a-f-]{36}$/.test(path)
    const isDraft = req.method === 'POST' && path.endsWith('/events/drafts')
    const delay = modes.has('slow') && (isDivisionsGet || isDetailGet) ? 2500 : modes.has('slow-write') && req.method !== 'GET' ? 2500 : 0
    log(req.method + ' ' + req.url + (isDraft ? ' key=' + req.headers['idempotency-key'] : ''))
    if (modes.has('fail-hub') && (isDivisionsGet || isDetailGet)) {
      setTimeout(() => { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"status":500,"message":"injected"}'); log('  -> 500 injected') }, delay || 600)
      return
    }
    const upstream = http.request({ ...TARGET, method: req.method, path: req.url, headers: { ...req.headers, host: 'localhost:' + TARGET.port } }, up => {
      const out = []
      up.on('data', c => out.push(c))
      up.on('end', () => {
        log('  -> ' + up.statusCode + ' ' + req.method + ' ' + path)
        if (isDraft && modes.has('lose-draft')) { modes.delete('lose-draft'); log('  -> response dropped (lose-draft)'); req.socket.destroy(); return }
        setTimeout(() => { res.writeHead(up.statusCode, up.headers); res.end(Buffer.concat(out)) }, delay)
      })
    })
    upstream.on('error', e => { res.writeHead(502); res.end(); log('  -> 502 ' + e.message) })
    upstream.end(body)
  })
}).listen(Number(process.env.PROXY_PORT ?? 8179), '127.0.0.1', () => log('proxy up'))
