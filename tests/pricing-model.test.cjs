const { test } = require('node:test')
const assert = require('node:assert/strict')
const model = require(process.env.PRICING_MODEL_MODULE)

const L = (key, limit) => ({ key, kind: 'LIMIT', state: 'LIMITED', limit })
const U = (key) => ({ key, kind: 'LIMIT', state: 'UNLIMITED' })
const B = (key, on) => ({ key, kind: 'BOOLEAN', state: on ? 'ENABLED' : 'DISABLED' })
const offer = (code, features, price, free = code === 'FREE') => ({ code, name: code, description: null, free, features, price })

const FREE = offer('FREE', [L('MAX_ACTIVE_TOURNAMENTS', 1), L('MAX_ENTRIES_PER_EVENT', 24), L('MAX_DIVISIONS_PER_EVENT', 2), L('MAX_STAFF_USERS', 1), B('ADVANCED_STATS', false), B('CUSTOM_BRANDING', false), B('PRIORITY_SUPPORT', false)], { status: 'FREE' })
const PRO = offer('PRO', [L('MAX_ACTIVE_TOURNAMENTS', 4), L('MAX_ENTRIES_PER_EVENT', 120), L('MAX_DIVISIONS_PER_EVENT', 5), L('MAX_STAFF_USERS', 5), B('ADVANCED_STATS', true), B('CUSTOM_BRANDING', true), B('PRIORITY_SUPPORT', false)], { status: 'PENDING' })
const ELITE = offer('ELITE', [U('MAX_ACTIVE_TOURNAMENTS'), U('MAX_ENTRIES_PER_EVENT'), U('MAX_DIVISIONS_PER_EVENT'), U('MAX_STAFF_USERS'), B('ADVANCED_STATS', true), B('CUSTOM_BRANDING', true), B('PRIORITY_SUPPORT', true)], { status: 'PENDING' })

test('the seeded catalog renders the canonical matrix in FREE, PRO, ELITE order', () => {
  const catalog = model.parsePricingCatalog([ELITE, FREE, PRO])
  assert.equal(catalog.status, 'ready')
  assert.deepEqual(catalog.offers.map((item) => item.code), ['FREE', 'PRO', 'ELITE'])
  const row = (key) => catalog.offers.map((item) => model.limitLabel(key, item.limits[key]))
  assert.deepEqual(row('MAX_ACTIVE_TOURNAMENTS'), ['1', '4', 'Ilimitados'])
  assert.deepEqual(row('MAX_ENTRIES_PER_EVENT'), ['24', '120', 'Ilimitadas'])
  assert.deepEqual(row('MAX_DIVISIONS_PER_EVENT'), ['2', '5', 'Ilimitadas'])
  assert.deepEqual(row('MAX_STAFF_USERS'), ['1', '5', 'Ilimitados'])
  const flags = (key) => catalog.offers.map((item) => model.flagLabel(item.flags[key]))
  assert.deepEqual(flags('ADVANCED_STATS'), ['No', 'Sí', 'Sí'])
  assert.deepEqual(flags('CUSTOM_BRANDING'), ['No', 'Sí', 'Sí'])
  assert.deepEqual(flags('PRIORITY_SUPPORT'), ['No', 'No', 'Sí'])
  assert.deepEqual(catalog.offers.map((item) => model.priceLabel(item.price)), ['Gratis', 'Precio por confirmar', 'Precio por confirmar'])
  assert.ok(model.OFFER_CODES.every((code) => model.offerCtaEnabled(catalog, code)))
})

test('an empty array is an empty catalog and never invents plans', () => {
  assert.deepEqual(model.parsePricingCatalog([]), { status: 'empty' })
  assert.deepEqual(model.parsePricingCatalog([{ code: 'LEGACY', features: [] }]), { status: 'empty' })
  assert.equal(model.offerCtaEnabled({ status: 'empty' }, 'FREE'), false)
})

test('a payload that is not an array is a read error', () => {
  assert.equal(model.parsePricingCatalog(null), null)
  assert.equal(model.parsePricingCatalog({ plans: [] }), null)
  assert.equal(model.parsePricingCatalog('[]'), null)
})

test('a missing offer shows Sin datos and disables only its CTA', () => {
  const catalog = model.parsePricingCatalog([FREE, PRO])
  assert.equal(catalog.status, 'incomplete')
  const elite = catalog.offers[2]
  assert.equal(elite.present, false)
  assert.equal(elite.complete, false)
  assert.equal(model.limitLabel('MAX_STAFF_USERS', elite.limits.MAX_STAFF_USERS), 'Sin datos')
  assert.equal(model.flagLabel(elite.flags.PRIORITY_SUPPORT), 'Sin datos')
  assert.equal(model.priceLabel(elite.price), 'Sin datos')
  assert.equal(model.offerCtaEnabled(catalog, 'FREE'), true)
  assert.equal(model.offerCtaEnabled(catalog, 'PRO'), true)
  assert.equal(model.offerCtaEnabled(catalog, 'ELITE'), false)
})

test('absent or invalid features are not mapped to 0, No or unlimited', () => {
  const broken = offer('PRO', [
    { key: 'MAX_ACTIVE_TOURNAMENTS', kind: 'LIMIT', state: 'ABSENT' },
    { key: 'MAX_ENTRIES_PER_EVENT', kind: 'LIMIT', state: 'LIMITED' },
    { key: 'MAX_DIVISIONS_PER_EVENT', kind: 'LIMIT', state: 'LIMITED', limit: 0 },
    { key: 'ADVANCED_STATS', kind: 'BOOLEAN', state: 'ABSENT' },
    { key: 'CUSTOM_BRANDING', kind: 'LIMIT', state: 'ENABLED' },
    B('PRIORITY_SUPPORT', false),
  ], { status: 'PENDING' })
  const catalog = model.parsePricingCatalog([FREE, broken, ELITE])
  const pro = catalog.offers[1]
  assert.equal(catalog.status, 'incomplete')
  assert.equal(model.limitLabel('MAX_ACTIVE_TOURNAMENTS', pro.limits.MAX_ACTIVE_TOURNAMENTS), 'Sin datos')
  assert.equal(model.limitLabel('MAX_ENTRIES_PER_EVENT', pro.limits.MAX_ENTRIES_PER_EVENT), 'Sin datos')
  assert.equal(model.limitLabel('MAX_DIVISIONS_PER_EVENT', pro.limits.MAX_DIVISIONS_PER_EVENT), '0', 'zero is a real ceiling')
  assert.equal(model.limitLabel('MAX_STAFF_USERS', pro.limits.MAX_STAFF_USERS), 'Sin datos')
  assert.equal(model.flagLabel(pro.flags.ADVANCED_STATS), 'Sin datos')
  assert.equal(model.flagLabel(pro.flags.CUSTOM_BRANDING), 'Sin datos')
  assert.equal(model.flagLabel(pro.flags.PRIORITY_SUPPORT), 'No')
  assert.equal(model.offerCtaEnabled(catalog, 'PRO'), false)
  assert.equal(model.offerCtaEnabled(catalog, 'ELITE'), true)
})

test('a price is formatted only with a valid amount, currency and period', () => {
  const price = (value) => model.parsePricingCatalog([FREE, offer('PRO', PRO.features, value), ELITE]).offers[1].price
  const yearly = model.priceLabel(price({ status: 'AVAILABLE', amount: '19900.5', currency: 'USD', period: 'YEAR' }))
  assert.match(yearly, /^USD\s?19\.900,50 \/ año$/)
  const monthly = model.priceLabel(price({ status: 'AVAILABLE', amount: '25000', currency: 'ARS', period: 'MONTH' }))
  assert.match(monthly, /^ARS\s?25\.000 \/ mes$/)
  for (const partial of [
    { status: 'AVAILABLE', amount: '25000', currency: 'ARS' },
    { status: 'AVAILABLE', amount: '25000', period: 'MONTH' },
    { status: 'AVAILABLE', currency: 'ARS', period: 'MONTH' },
    { status: 'AVAILABLE', amount: '0', currency: 'ARS', period: 'MONTH' },
    { status: 'AVAILABLE', amount: '1.234', currency: 'ARS', period: 'MONTH' },
    { status: 'AVAILABLE', amount: '100', currency: 'ars', period: 'WEEK' },
    { status: 'PENDING' },
  ]) {
    const label = model.priceLabel(price(partial))
    assert.equal(label, 'Precio por confirmar')
    assert.doesNotMatch(label, /undefined|null|\b0\b/)
  }
  assert.match(model.priceSpoken(price({ status: 'AVAILABLE', amount: '10', currency: 'USD', period: 'MONTH' })), /por mes$/)
})

test('a paid offer without a price object is incomplete; FREE stays Gratis', () => {
  const catalog = model.parsePricingCatalog([FREE, offer('PRO', PRO.features, null), ELITE])
  assert.equal(catalog.offers[0].price.kind, 'free')
  assert.equal(catalog.offers[1].price, null)
  assert.equal(model.offerCtaEnabled(catalog, 'PRO'), false)
})

test('segment keyboard targets do not wrap', () => {
  assert.equal(model.segmentKeyTarget('ArrowRight', 0, 3), 1)
  assert.equal(model.segmentKeyTarget('ArrowRight', 2, 3), 2)
  assert.equal(model.segmentKeyTarget('ArrowLeft', 0, 3), 0)
  assert.equal(model.segmentKeyTarget('Home', 2, 3), 0)
  assert.equal(model.segmentKeyTarget('End', 0, 3), 2)
  assert.equal(model.segmentKeyTarget('Enter', 0, 3), null)
})

test('scroll offsets map to the offer in focus and clamp at the end', () => {
  // 402 px: cards of 330 + 12 gap, padding 16, viewport 402 → max offset 680.
  const starts = [0, 342, 684]
  assert.equal(model.offerAtOffset(0, 680, starts), 0)
  assert.equal(model.offerAtOffset(330, 680, starts), 1)
  assert.equal(model.offerAtOffset(680, 680, starts), 2)
  assert.equal(model.offsetForOffer(2, starts, 680), 680)
  // 768 px tablet: PRO and ELITE share the final offset; reaching it announces ELITE.
  const tablet = [0, 342, 684]
  assert.equal(model.offsetForOffer(1, tablet, 316), 316)
  assert.equal(model.offsetForOffer(2, tablet, 316), 316)
  assert.equal(model.offerAtOffset(316, 316, tablet), 2)
})

test('catalog loader reuses an in-flight read and ignores results after dispose', async () => {
  let calls = 0
  let resolve
  const loader = model.createCatalogLoader(() => { calls += 1; return new Promise((done) => { resolve = done }) })
  const published = []
  const first = loader.load((result) => published.push(result))
  const second = loader.load((result) => published.push(result))
  assert.equal(first, second)
  assert.equal(calls, 1)
  assert.equal(loader.busy, true)
  resolve([FREE, PRO, ELITE])
  await first
  assert.equal(published.length, 1)
  assert.equal(published[0].ok, true)
  assert.equal(loader.busy, false)

  const late = loader.load((result) => published.push(result))
  loader.dispose()
  resolve([])
  await late
  assert.equal(published.length, 1)

  // A remount after dispose (React StrictMode) starts a fresh read that does publish.
  const again = loader.load((result) => published.push(result))
  assert.notEqual(again, late)
  resolve([FREE])
  await again
  assert.equal(published.length, 2)
})

test('loader publishes failures for rejected reads and invalid payloads', async () => {
  const failing = model.createCatalogLoader(() => Promise.reject(Object.assign(new Error('offline'), { status: 0 })))
  let result
  await failing.load((value) => { result = value })
  assert.deepEqual(result, { ok: false })
  const invalid = model.createCatalogLoader(() => Promise.resolve({ nope: true }))
  await invalid.load((value) => { result = value })
  assert.deepEqual(result, { ok: false })
})

test('a failed refresh keeps visible data; a failed first read shows the error', () => {
  const ready = { phase: 'ready', catalog: model.parsePricingCatalog([FREE, PRO, ELITE]), refreshFailed: false }
  const kept = model.settleCatalog(ready, { ok: false }, true)
  assert.equal(kept.phase, 'ready')
  assert.equal(kept.refreshFailed, true)
  assert.equal(kept.catalog, ready.catalog)
  assert.equal(model.settleCatalog(ready, { ok: false }, false).phase, 'error')
  assert.equal(model.settleCatalog(model.INITIAL_CATALOG_STATE, { ok: false }, true).phase, 'error')
  const fresh = model.settleCatalog(kept, { ok: true, catalog: ready.catalog }, true)
  assert.equal(fresh.refreshFailed, false)
})

test('the offer in focus survives a refresh while it is still published', () => {
  const full = model.parsePricingCatalog([FREE, PRO, ELITE])
  assert.equal(model.focusAfterRefresh('ELITE', full), 'ELITE')
  assert.equal(model.focusAfterRefresh('ELITE', model.parsePricingCatalog([FREE, PRO])), 'FREE')
  assert.equal(model.focusAfterRefresh('PRO', { status: 'empty' }), 'FREE')
})
