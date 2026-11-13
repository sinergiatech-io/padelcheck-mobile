const { test } = require('node:test')
const assert = require('node:assert/strict')
const { Infrastructure, VenueDraft, parseVenue, pointValid, catalogMatch } = require(process.env.VENUES_TEST_MODULE)
const location = { countryCode: 'AR', provinceId: 'AR-B', provinceName: 'Buenos Aires', localityId: 'l1', localityName: 'Tandil', latitude: -37.32, longitude: -59.13, pointSource: 'ADMIN_CONFIRMED' }
const venue = (id = 'v1', extra = {}) => ({ id, clubId: 'c1', name: 'Sede', address: 'Calle 1', city: 'Tandil', countryDivision: 'Buenos Aires', country: 'Argentina', status: 'ACTIVE', location, courts: [{ id: 'court1', venueId: id, name: 'Cancha', status: 'ACTIVE', usable: true }], ...extra })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
test('province search accepts Spanish names without accents and with different case', () => {
  assert.equal(catalogMatch('Córdoba', 'CORDOBA'), true)
  assert.equal(catalogMatch('Entre Ríos', 'rios'), true)
  assert.equal(catalogMatch('Chaco', 'Chubut'), false)
})
test('rejects venues and courts from another parent', () => {
  assert.throws(() => parseVenue(venue('v1', { clubId: 'other' }), 'c1'))
  assert.throws(() => parseVenue(venue('v1', { courts: [{ id: 'court', venueId: 'other', name: 'x', status: 'ACTIVE', usable: true }] }), 'c1'))
})
test('address and locality changes remove confirmed point from request; name-only does not', () => {
  const draft = new VenueDraft({}, parseVenue(venue(), 'c1'), null)
  draft.field('name', 'Nuevo nombre')
  assert.equal(draft.request().location.coordinatesConfirmed, true)
  draft.field('address', 'Calle 2')
  assert.equal(draft.stalePoint, true)
  assert.equal(draft.request().location.latitude, undefined)
  draft.confirmPoint({ latitude: -37.33, longitude: -59.14 })
  assert.equal(draft.request().pointConfirmedForAddress, 'Calle 2')
  draft.selectLocality({ id: 'l2', provinceId: 'AR-B', name: 'Otra', latitude: -37, longitude: -59 })
  assert.equal(draft.request().location.coordinatesConfirmed, undefined)
})
test('unverified locality never becomes a false coordinate or a confirmed venue point', () => {
  const draft = new VenueDraft({}, null, location)
  assert.equal(pointValid(draft.state.locality), false)
  assert.equal(draft.validPoint, null)
  draft.field('name', 'Nueva'); draft.field('address', 'Calle')
  assert.equal(draft.request().location.latitude, undefined)
})
test('changing province clears locality and ignores delayed previous catalogue', async () => {
  const old = deferred()
  const draft = new VenueDraft({ get: path => path.includes('AR-B') ? old.promise : Promise.resolve({ items: [{ id: 'l3', provinceId: 'AR-C', name: 'CABA', latitude: -34.6, longitude: -58.4 }], total: 1 }) }, null, location)
  const request = draft.localities('Tandil')
  await draft.selectProvince({ id: 'AR-C', name: 'CABA' })
  old.resolve({ items: [{ id: 'l1', provinceId: 'AR-B', name: 'Tandil', latitude: -37, longitude: -59 }], total: 1 }); await request
  assert.equal(draft.state.locality, null)
  assert.deepEqual(draft.state.localities.map(l => l.id), ['l3'])
})
test('a response after leaving a club cannot populate its abandoned model', async () => {
  const read = deferred(), model = new Infrastructure({ get: () => read.promise }, 'c1')
  const request = model.load(); model.cancel(); read.resolve([venue()]); await request
  assert.deepEqual(model.state.venues, [])
})
test('refresh predating a successful write cannot overwrite persisted data', async () => {
  const refresh = deferred(); let calls = 0
  const model = new Infrastructure({ get: () => ++calls === 1 ? Promise.resolve([venue()]) : refresh.promise, patch: () => Promise.resolve(venue('v1', { name: 'Saved' })) }, 'c1')
  await model.load(); const pending = model.load(true)
  await model.saveVenue('v1', {})
  refresh.resolve([venue()]); await pending
  assert.equal(model.state.venues[0].name, 'Saved')
  assert.equal(model.state.refreshing, false)
})
test('writes keep persisted switches until success and prevent double submission', async () => {
  const write = deferred(); let calls = 0
  const model = new Infrastructure({ get: async () => [venue()], patch: () => { calls++; return write.promise } }, 'c1')
  await model.load(); const pending = model.setVenueStatus('v1', false, true)
  await assert.rejects(model.setVenueStatus('v1', false, true), /Already saving/)
  assert.equal(calls, 1); assert.equal(model.state.venues[0].status, 'ACTIVE')
  write.resolve(venue('v1', { status: 'INACTIVE' })); await pending
  assert.equal(model.state.venues[0].status, 'INACTIVE'); assert.equal(model.state.saving, false)
})
test('failed status write preserves saved state and a later retry succeeds', async () => {
  let fail = true
  const model = new Infrastructure({ get: async () => [venue()], patch: async () => { if (fail) throw new Error('VENUE_HAS_PENDING_MATCHES'); return venue('v1', { status: 'INACTIVE' }) } }, 'c1')
  await model.load()
  await assert.rejects(model.setVenueStatus('v1', false, true), /VENUE_HAS_PENDING_MATCHES/)
  assert.equal(model.state.venues[0].status, 'ACTIVE'); assert.equal(model.state.saving, false)
  fail = false; await model.setVenueStatus('v1', false, true)
  assert.equal(model.state.venues[0].status, 'INACTIVE')
})
test('an active empty venue does not disguise losing the last usable infrastructure', async () => {
  const model = new Infrastructure({ get: async () => [venue(), venue('empty', { courts: [] })] }, 'c1')
  await model.load(); assert.equal(model.lastVenue('v1'), true); assert.equal(model.lastCourt(), true)
})
test('aborted initialization does not launch another catalogue request', async () => {
  const read = deferred(); let calls = 0
  const draft = new VenueDraft({ get: () => { calls++; return read.promise } }, null, location)
  const pending = draft.initialize(); draft.cancel(); read.resolve({ items: [] }); await pending
  assert.equal(calls, 1)
})
