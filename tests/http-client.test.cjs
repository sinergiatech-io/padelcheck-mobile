const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { createApiClient, ApiError } = require(path.join(process.env.HTTP_TEST_DIRECTORY, 'http-client.cjs'))
const { resolveApiBase, isLocalEnvironment } = require(path.join(process.env.HTTP_TEST_DIRECTORY, 'api-config.cjs'))
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch })
const client = (getToken = () => null) => createApiClient({ baseUrl: 'https://api.example/api', getToken })
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

test('GET JSON, async bearer, query and Headers input; web credentials retained', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://api.example/api/items?page=2')
    assert.equal(init.method, 'GET')
    assert.equal(init.headers.get('Authorization'), 'Bearer test-only')
    assert.equal(init.headers.get('X-Test'), 'yes')
    assert.equal(init.credentials, 'include')
    return json({ id: 1 })
  }
  const api = createApiClient({ baseUrl: 'https://api.example/api', getToken: async () => 'test-only', credentials: 'include' })
  assert.deepEqual(await api.get('/items?page=2', { headers: new Headers({ 'X-Test': 'yes' }) }), { id: 1 })
})

test('POST/PUT/PATCH serialize once; DELETE accepts 204; empty 200 is undefined', async () => {
  const api = client()
  for (const method of ['post', 'put', 'patch', 'delete']) {
    let calls = 0
    global.fetch = async (_url, init) => {
      calls++
      assert.equal(init.method, method.toUpperCase())
      assert.equal(init.body, method === 'delete' ? undefined : '{"id":2}')
      if (init.body) assert.equal(init.headers.get('content-type'), 'application/json')
      return new Response(null, { status: 204 })
    }
    assert.equal(await api[method]('/items/2', ...(method === 'delete' ? [] : [{ id: 2 }])), undefined)
    assert.equal(calls, 1)
  }
  global.fetch = async () => new Response('', { headers: { 'content-type': 'application/json' } })
  assert.equal(await api.get('/items'), undefined)
})

for (const status of [400, 401, 403, 409, 422, 500]) {
  for (const code of [undefined, 'BUSINESS_RULE']) {
    test(`HTTP ${status}, code ${code}: full error payload retained without session side effects`, async () => {
      const payload = { timestamp: '2026-10-28T00:00:00Z', status, error: 'Failure', message: 'Business message', path: '/api/items', ...(code ? { code } : {}) }
      global.fetch = async () => json(payload, status)
      await assert.rejects(client().post('/items', {}), error => {
        assert.ok(error instanceof ApiError)
        assert.equal(error.status, status)
        assert.equal(error.code, code)
        assert.equal(error.message, payload.message)
        assert.equal(error.kind, 'http')
        assert.deepEqual(error.details, payload)
        return true
      })
    })
  }
}

test('HTTP status is authoritative; missing message/code and non-object bodies have fallback', async () => {
  for (const payload of [{ status: 200 }, null, ['unexpected']]) {
    global.fetch = async () => json(payload, 403)
    await assert.rejects(client().get('/items'), error => {
      assert.equal(error.status, 403)
      assert.equal(error.message, 'Request failed with status 403')
      assert.deepEqual(error.details, payload)
      return true
    })
  }
})

test('text, empty and malformed JSON errors keep status and original payload', async () => {
  for (const raw of ['<html>gateway</html>', '{broken', '']) {
    global.fetch = async () => new Response(raw, { status: 502, headers: { 'content-type': 'application/json' } })
    await assert.rejects(client().get('/items'), error => error.status === 502 && error.details === (raw || undefined))
  }
})

test('malformed success JSON is an explicit failure, not simulated success', async () => {
  global.fetch = async () => new Response('{broken', { headers: { 'content-type': 'application/json' } })
  await assert.rejects(client().get('/items'), error => error.kind === 'invalid-response' && error.status === 200 && error.details === '{broken')
})

test('network errors do not leak internals or retry writes', async () => {
  let calls = 0
  global.fetch = async () => { calls++; throw new TypeError('private platform error') }
  await assert.rejects(client().post('/items', {}), error => error.kind === 'network' && error.status === 0 && error.details === undefined)
  assert.equal(calls, 1)
})

test('pre-cancelled signal does not call fetch', async () => {
  const controller = new AbortController()
  controller.abort()
  global.fetch = async () => { assert.fail('fetch must not run') }
  await assert.rejects(client().get('/items', { signal: controller.signal }), error => error.kind === 'cancelled')
})

test('in-flight abort and optional timeout are distinguishable; listeners cleaned', async () => {
  for (const timeout of [false, true]) {
    const controller = new AbortController()
    let removed = 0
    const originalRemove = controller.signal.removeEventListener.bind(controller.signal)
    controller.signal.removeEventListener = (...args) => { removed++; originalRemove(...args) }
    global.fetch = (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('abort')), { once: true })
      if (!timeout) controller.abort()
    })
    await assert.rejects(client().patch('/items', {}, { signal: controller.signal, ...(timeout ? { timeoutMs: 5 } : {}) }), error => error.kind === (timeout ? 'timeout' : 'cancelled'))
    assert.equal(removed, 1)
    assert.equal(controller.signal.aborted, !timeout)
  }
})

test('timeout also covers response body; keeps received HTTP status', async () => {
  global.fetch = async (_url, init) => ({ status: 200, text: () => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('body aborted')), { once: true })
  }) })
  await assert.rejects(client().get('/items', { timeoutMs: 5 }), error => error.kind === 'timeout' && error.status === 200)
})

test('absolute/external paths and invalid timeout rejected before token or network', async () => {
  const api = client(() => { assert.fail('token must not be read') })
  for (const bad of ['https://other.example/items', '//other.example/items', '/\\other.example', '/items#fragment']) {
    await assert.rejects(api.get(bad), TypeError)
  }
  for (const timeoutMs of [0, -1, Infinity, NaN, 2147483648]) await assert.rejects(api.get('/items', { timeoutMs }), RangeError)
})

test('environment base normalized; validation/production never fall back to localhost/proxy', () => {
  for (const raw of ['https://api.example', 'https://api.example/', ' https://api.example/api/ ']) {
    assert.equal(resolveApiBase(raw, false, 'http://localhost:8080/api'), 'https://api.example/api')
  }
  assert.equal(resolveApiBase(undefined, true, '/api'), '/api')
  assert.equal(resolveApiBase(undefined, true, 'http://10.0.2.2:8080/api'), 'http://10.0.2.2:8080/api')
  for (const environment of ['validation', 'production']) {
    assert.equal(isLocalEnvironment(environment, true), false)
    assert.throws(() => resolveApiBase(undefined, isLocalEnvironment(environment, true), 'http://localhost:8080/api'))
  }
  assert.equal(isLocalEnvironment(undefined, false), false)
  assert.equal(isLocalEnvironment('local', false), false)
  assert.throws(() => isLocalEnvironment('typo', true))
  for (const raw of ['/api', 'ftp://api.example', 'https://user:pass@api.example', 'https://api.example/api/api', 'https://api.example?key=value', 'https://api.example/#fragment']) {
    assert.throws(() => resolveApiBase(raw, false, ''))
  }
})
