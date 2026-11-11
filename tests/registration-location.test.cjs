const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path')
const { RegistrationLocation, PositionError, filterProvinces } = require(path.join(process.env.LOCATION_TEST_DIR, 'registration-location.cjs'))
const provinces = [{ id: '06', name: 'Buenos Aires' }, { id: '02', name: 'Ciudad Autónoma de Buenos Aires' }]
const tandil = { id: '06791050', name: 'Tandil', provinceId: '06' }
const city = { id: 'AR-CABA', name: 'Ciudad Autónoma de Buenos Aires', provinceId: '02' }
const point = { latitude: -37.32, longitude: -59.13 }
const resolved = { status: 'RESOLVED', location: { countryCode: 'AR', provinceId: '06', provinceName: 'Buenos Aires', localityId: tandil.id, localityName: 'Tandil', ...point } }
function deferred() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }
function setup({ permission = 'prompt', position = async () => point, response } = {}) {
  const calls = [], providerCalls = []
  const api = { get: async (url, options) => { calls.push({ url, options }); if (response) return response(url, options)
    if (url.startsWith('/locations/provinces')) return { items: provinces }
    if (url.startsWith('/locations/resolve')) return resolved
    return { items: url.includes('provinceId=02') ? [city] : [tandil], total: 1 }
  } }
  const m = new RegistrationLocation(api, { permission: async () => permission, position: signal => { providerCalls.push(signal); return position(signal) } })
  return { m, calls, providerCalls }
}
test('prompt permission never prompts on initialization; granted resolves once and carries device point', async () => {
  const a = setup(); await a.m.initialize(); assert.equal(a.m.state.mode,'choice'); assert.equal(a.providerCalls.length,0)
  const b = setup({ permission:'granted' }); await b.m.initialize(); await b.m.initialize(); assert.equal(b.providerCalls.length,1); assert.equal(b.m.state.mode,'resolved')
  assert.deepEqual(b.m.request(), { countryCode:'AR', provinceId:'06', localityId:tandil.id, ...point }); assert.equal(b.m.validate(),true)
})
test('denied permission and unsupported devices use catalog manual path without requesting location', async () => {
  for (const permission of ['denied','unavailable']) { const {m,providerCalls}=setup({permission});await m.initialize();assert.equal(m.state.mode,'manual');assert.equal(m.state.problem,permission);assert.equal(m.state.provinceStatus,'ready');assert.equal(providerCalls.length,0) }
})
test('permission rejection is recoverable and outside coverage follows the actual server contract', async () => {
  for (const reason of ['denied','unavailable']) {const {m}=setup({position:async()=>{throw new PositionError(reason)}});await m.detect();assert.equal(m.state.mode,'manual');assert.equal(m.state.problem,reason)}
  const {m}=setup({response:async url=>url.includes('resolve')?{status:'UNRESOLVED',reason:'OUTSIDE_COVERAGE'}:{items:provinces}});await m.detect();assert.equal(m.state.problem,'outside');assert.equal(m.request(),undefined)
})
test('incomplete or non-Argentine resolution never becomes a fabricated selected locality', async () => {
  for (const location of [{countryCode:'AR',provinceId:'06'}, {...resolved.location,countryCode:'UY'}]) {const {m}=setup({response:async url=>url.includes('resolve')?{status:'RESOLVED',location}:{items:provinces}});await m.detect();assert.equal(m.state.mode,'manual');assert.equal(m.request(),undefined)}
})
test('manual selection is required, uses catalog values, clears locality and drops old device coordinates', async () => {
  const {m}=setup();await m.detect();await m.manual();await m.selectProvince(provinces[0]);assert.equal(m.request(),undefined);assert.equal(m.validate(),false)
  m.selectLocality({...tandil,id:'invented'});assert.equal(m.request(),undefined);m.selectLocality(tandil);assert.deepEqual(m.request(),{countryCode:'AR',provinceId:'06',localityId:tandil.id})
  await m.selectProvince(provinces[1]);assert.equal(m.state.selection,null);m.selectLocality(tandil);assert.equal(m.request(),undefined);m.selectLocality(city);assert.equal(m.request().localityId,'AR-CABA')
})
test('late device resolution cannot overwrite an explicit manual choice', async () => {
  const pending=deferred(),{m}=setup({position:()=>pending.promise});const detect=m.detect();await m.manual();await m.selectProvince(provinces[1]);m.selectLocality(city);pending.resolve(point);await detect
  assert.equal(m.state.mode,'manual');assert.equal(m.request().localityId,'AR-CABA');assert.equal(m.request().latitude,undefined)
})
test('submitting while detecting cannot send an old hidden selection', async () => {
  let pending;const {m}=setup({position:()=>pending?pending.promise:Promise.resolve(point)});await m.detect();pending=deferred();const detect=m.detect();assert.equal(m.state.mode,'detecting');assert.equal(m.validate(),false);assert.equal(m.request(),undefined);await m.manual();pending.resolve(point);await detect
})
test('stale locality response from another province is ignored even if transport does not abort', async () => {
  const slow=deferred(),{m}=setup({response:async url=>url.includes('provinces')?{items:provinces}:url.includes('provinceId=06')?slow.promise:{items:[city],total:1}})
  await m.manual();const first=m.selectProvince(provinces[0]);await m.selectProvince(provinces[1]);slow.resolve({items:[tandil],total:1});await first;assert.deepEqual(m.state.localities,[city])
})
test('search results are bounded/paged and malformed responses cannot enable a selection', async () => {
  const {m,calls}=setup();await m.manual();await m.selectProvince(provinces[0]);await m.searchLocalities('Tandil',1);assert.match(calls.at(-1).url,/q=Tandil&page=1&size=25/)
  const bad=setup({response:async url=>url.includes('provinces')?{items:provinces}:{items:[city],total:1}}).m;await bad.manual();await bad.selectProvince(provinces[0]);assert.equal(bad.state.localityStatus,'error');assert.equal(bad.request(),undefined)
})
test('a failed catalog retry preserves province and selected location', async () => {
  let fail=false;const {m}=setup({response:async url=>{if(fail)throw Error('offline');return url.includes('provinces')?{items:provinces}:{items:[tandil],total:1}}});await m.manual();await m.selectProvince(provinces[0]);m.selectLocality(tandil);fail=true;await m.searchLocalities('Ta');assert.equal(m.state.localityStatus,'error');assert.equal(m.request().localityId,tandil.id);fail=false;await m.searchLocalities(m.state.query);assert.equal(m.state.localityStatus,'ready')
})
test('cancellation prevents state updates and reinitializing resumes interrupted manual catalog', async () => {
  const slow=deferred();let first=true;const {m}=setup({response:async url=>url.includes('provinces')?{items:provinces}:first?(first=false,slow.promise):{items:[tandil],total:1}});await m.manual();const loading=m.selectProvince(provinces[0]);m.cancel();assert.equal(m.state.localityStatus,'idle');await m.initialize();assert.equal(m.state.localityStatus,'ready');slow.resolve({items:[city],total:1});await loading;assert.deepEqual(m.state.localities,[tandil])
})
test('validation keeps the current location problem visible', async () => {
  const {m}=setup({position:async()=>{throw new PositionError('unavailable')}}); await m.detect()
  assert.equal(m.validate(), false); assert.equal(m.state.mode,'manual'); assert.equal(m.state.problem,'unavailable')
  assert.equal(m.state.errors.province,'Seleccioná una provincia.'); assert.equal(m.state.errors.locality,'Seleccioná una localidad.')
})
test('province matching ignores accents and case without inventing options', () => {
  assert.deepEqual(filterProvinces(provinces,'AUTONOMA'),[provinces[1]]);assert.deepEqual(filterProvinces(provinces,'not-a-province'),[])
})
