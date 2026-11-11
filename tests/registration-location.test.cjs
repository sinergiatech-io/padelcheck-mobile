const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path')
const { RegistrationLocation, PositionError } = require(path.join(process.env.LOCATION_TEST_DIR, 'registration-location.cjs'))
const provinces = [{ id: '06', name: 'Buenos Aires' }, { id: '02', name: 'Ciudad Autónoma de Buenos Aires' }]
const tandil = { id: '06791050', name: 'Tandil', provinceId: '06' }
const city = { id: 'AR-CABA', name: 'Ciudad Autónoma de Buenos Aires', provinceId: '02' }
const point = { latitude: -37.32, longitude: -59.13 }
const resolved = { status: 'RESOLVED', location: { countryCode: 'AR', provinceId: '06', provinceName: 'Buenos Aires', localityId: tandil.id, localityName: 'Tandil', ...point } }
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function setup({ permission = 'prompt', position = async () => point, response } = {}) {
  const calls = [], providerCalls = []
  const api = { get: async (url, options) => { calls.push({ url, options }); if (response) return response(url, options)
    if (url.startsWith('/locations/provinces')) return { items: provinces }
    if (url.startsWith('/locations/resolve')) return resolved
    return { items: url.includes('provinceId=02') ? [city] : [tandil], total: 1 }
  } }
  const model = new RegistrationLocation(api, { permission: async () => permission, position: signal => { providerCalls.push(signal); return position(signal) } })
  return { model, calls, providerCalls }
}
async function until(read) { for (let i = 0; i < 20 && !read(); i++) await new Promise(resolve => setTimeout(resolve, 0)); if (!read()) throw new Error('timed out') }

test('opening asks once and a granted permission fills the selectors without asking again', async () => {
  const pending = deferred()
  const prompted = setup({ position: () => pending.promise })
  const opening = prompted.model.initialize()
  await until(() => prompted.providerCalls.length === 1 && prompted.model.state.provinceStatus === 'ready')
  assert.equal(prompted.model.state.mode, 'detecting')
  assert.equal(prompted.model.state.province, null)
  assert.equal(prompted.model.validate(), false)
  pending.resolve(point)
  await opening
  assert.equal(prompted.providerCalls.length, 1)
  assert.equal(prompted.model.state.province.name, 'Buenos Aires')
  assert.equal(prompted.model.state.selection.localityName, 'Tandil')
  assert.deepEqual(prompted.model.request(), { countryCode: 'AR', provinceId: '06', localityId: tandil.id, ...point })
  await prompted.model.initialize()
  await prompted.model.detect()
  assert.equal(prompted.providerCalls.length, 1)

  const granted = setup({ permission: 'granted' })
  await granted.model.initialize()
  await granted.model.initialize()
  assert.equal(granted.providerCalls.length, 1)
  assert.equal(granted.model.state.selection.localityId, tandil.id)
})

test('a blocked or unsupported device stays manual and never calls the location prompt', async () => {
  for (const permission of ['denied', 'unavailable']) {
    const { model, providerCalls } = setup({ permission })
    await model.initialize()
    await model.detect()
    assert.equal(model.state.mode, 'form')
    assert.equal(model.state.problem, permission)
    assert.equal(model.state.province, null)
    assert.equal(model.state.provinceStatus, 'ready')
    assert.equal(providerCalls.length, 0)
  }
})

test('rejection, timeout and coverage failure leave the selectors empty and do not ask again', async () => {
  for (const reason of ['denied', 'unavailable']) {
    const { model, providerCalls } = setup({ position: async () => { throw new PositionError(reason) } })
    await model.detect()
    await model.detect()
    assert.equal(model.state.mode, 'form')
    assert.equal(model.state.problem, reason)
    assert.equal(model.state.selection, null)
    assert.equal(providerCalls.length, 1)
  }
  const outside = setup({ response: async url => url.includes('resolve') ? { status: 'UNRESOLVED', reason: 'OUTSIDE_COVERAGE' } : { items: provinces } })
  await outside.model.detect()
  await outside.model.detect()
  assert.equal(outside.model.state.problem, 'outside')
  assert.equal(outside.model.request(), undefined)
  assert.equal(outside.providerCalls.length, 1)
})

test('an incomplete or non-Argentine resolution never becomes a selected locality', async () => {
  for (const location of [{ countryCode: 'AR', provinceId: '06' }, { ...resolved.location, countryCode: 'UY' }]) {
    const { model } = setup({ response: async url => url.includes('resolve') ? { status: 'RESOLVED', location } : { items: provinces } })
    await model.detect()
    assert.equal(model.state.mode, 'form')
    assert.equal(model.request(), undefined)
  }
})

test('the form can be completed while the permission request is still open', async () => {
  const pending = deferred()
  const { model } = setup({ position: () => pending.promise })
  const detect = model.detect()
  await model.loadProvinces()
  assert.equal(model.state.mode, 'detecting')
  assert.equal(model.validate(), false)
  await model.selectProvince(provinces[1])
  model.selectLocality(city)
  assert.equal(model.validate(), true)
  assert.deepEqual(model.request(), { countryCode: 'AR', provinceId: '02', localityId: city.id })
  pending.resolve(point)
  await detect
  assert.equal(model.request().localityId, city.id)
  assert.equal(model.request().latitude, undefined)
})

test('changing province clears the locality and drops the previous device point', async () => {
  const { model } = setup()
  await model.loadProvinces()
  await model.detect()
  assert.equal(model.request().latitude, point.latitude)
  await model.selectProvince(provinces[0])
  assert.equal(model.request(), undefined)
  assert.equal(model.validate(), false)
  model.selectLocality({ ...tandil, id: 'invented' })
  assert.equal(model.request(), undefined)
  model.selectLocality(tandil)
  assert.deepEqual(model.request(), { countryCode: 'AR', provinceId: '06', localityId: tandil.id })
  await model.selectProvince(provinces[1])
  assert.equal(model.state.selection, null)
  model.selectLocality(tandil)
  assert.equal(model.request(), undefined)
  model.selectLocality(city)
  assert.equal(model.request().localityId, city.id)
  assert.equal(model.request().latitude, undefined)
})

test('a locality page from the previous province cannot replace the current one', async () => {
  const slow = deferred()
  const { model } = setup({ response: async url => url.includes('provinces') ? { items: provinces } : url.includes('provinceId=06') ? slow.promise : { items: [city], total: 1 } })
  await model.loadProvinces()
  const first = model.selectProvince(provinces[0])
  await model.selectProvince(provinces[1])
  slow.resolve({ items: [tandil], total: 1 })
  await first
  assert.deepEqual(model.state.localities, [city])
})

test('localities load in catalog pages of 100 and a malformed page cannot be selected', async () => {
  const page = Array.from({ length: 100 }, (_, index) => ({ id: `06-${index}`, name: `Localidad ${index}`, provinceId: '06' }))
  const { model, calls } = setup({ response: async url => {
    if (url.includes('provinces')) return { items: provinces }
    if (url.includes('page=0')) return { items: page, total: 101 }
    if (url.includes('page=1')) return { items: [tandil], total: 101 }
    return { items: [], total: 0 }
  } })
  await model.loadProvinces()
  await model.selectProvince(provinces[0])
  assert.equal(model.state.localities.length, 101)
  assert.match(calls.find(call => call.url.includes('localities')).url, /q=&page=0&size=100/)
  assert.ok(calls.some(call => call.url.includes('page=1&size=100')))
  const bad = setup({ response: async url => url.includes('provinces') ? { items: provinces } : { items: [city], total: 1 } }).model
  await bad.loadProvinces()
  await bad.selectProvince(provinces[0])
  assert.equal(bad.state.localityStatus, 'error')
  assert.equal(bad.request(), undefined)
})

test('a failed locality retry keeps the province and the selected locality', async () => {
  let fail = false
  const { model } = setup({ response: async url => {
    if (fail && url.includes('localities')) throw new Error('offline')
    return url.includes('provinces') ? { items: provinces } : { items: [tandil], total: 1 }
  } })
  await model.loadProvinces()
  await model.selectProvince(provinces[0])
  model.selectLocality(tandil)
  fail = true
  await model.loadLocalities()
  assert.equal(model.state.localityStatus, 'error')
  assert.equal(model.request().localityId, tandil.id)
  fail = false
  await model.loadLocalities()
  assert.equal(model.state.localityStatus, 'ready')
  assert.equal(model.request().localityId, tandil.id)
})

test('cancellation ignores a stale page and the next open reloads the selected province', async () => {
  const slow = deferred()
  let first = true
  const { model, providerCalls } = setup({
    permission: 'prompt',
    response: async url => url.includes('provinces') ? { items: provinces } : first ? (first = false, slow.promise) : { items: [tandil], total: 1 },
  })
  await model.loadProvinces()
  const loading = model.selectProvince(provinces[0])
  model.cancel()
  assert.equal(model.state.localityStatus, 'idle')
  await model.initialize()
  assert.equal(providerCalls.length, 0)
  assert.equal(model.state.localityStatus, 'ready')
  slow.resolve({ items: [city], total: 1 })
  await loading
  assert.deepEqual(model.state.localities, [tandil])
})

test('validation reports the empty selectors without hiding a previous failure', async () => {
  const { model } = setup({ position: async () => { throw new PositionError('unavailable') } })
  await model.detect()
  assert.equal(model.validate(), false)
  assert.equal(model.state.mode, 'form')
  assert.equal(model.state.problem, 'unavailable')
  assert.equal(model.state.errors.province, 'Seleccioná una provincia.')
  assert.equal(model.state.errors.locality, 'Seleccioná una localidad.')
})
