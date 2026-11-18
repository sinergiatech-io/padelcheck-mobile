const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path')
const dir = process.env.ONBOARDING_TEST_DIR
const { ClubOnboardingFlow } = require(path.join(dir, 'onboarding-flow.cjs'))
const model = require(path.join(dir, 'onboarding-model.cjs'))

const http = (status, kind = 'http') => Object.assign(new Error(`HTTP ${status}`), { status, kind })
const network = () => Object.assign(new Error('offline'), { status: 0, kind: 'network' })
const SECRET = 'Sup3r-secret-pass'
const account = { firstName: 'Lucía', lastName: 'Pérez', email: ' lucia@clubnorte.com ', password: SECRET, phone: '' }
const location = { countryCode: 'AR', provinceId: '82', localityId: '82084270' }
const names = { provinceName: 'Santa Fe', localityName: 'Rosario' }
const resumeRow = (patch = {}) => ({
  sessionId: 's1', step: 'EMAIL_VERIFICATION', email: 'lucia@clubnorte.com', firstName: 'Lucía', lastName: 'Pérez', phone: null, emailVerified: false,
  club: null, selectedPlanCode: null, clubId: null, subscriptionPlanCode: null, subscriptionStatus: null, initialSetupStatus: null, paymentStatus: null, ...patch,
})
const clubRow = { name: 'Club Norte', city: 'Rosario', countryDivision: 'Santa Fe', country: 'Argentina', location: { countryCode: 'AR', provinceId: '82', localityId: '82084270' } }

function setup({ handlers = {}, saved = null, platform = 'ANDROID' } = {}) {
  const calls = [], opened = []
  let stored = saved ? JSON.stringify(saved) : null
  const answer = async (method, url, body, authed) => {
    calls.push({ method, url, body, authed })
    const key = `${method} ${url.split('?')[0]}`
    const handler = handlers[key]
    if (!handler) throw http(500)
    return typeof handler === 'function' ? handler(body, url, authed) : handler
  }
  const writes = []
  const flow = new ClubOnboardingFlow({
    platform,
    api: { post: (url, body) => answer('POST', url, body, false), get: url => answer('GET', url, undefined, false), getAuthenticated: url => answer('GET', url, undefined, true) },
    store: {
      load: async () => stored ? model.parseSavedSession(stored) : null,
      save: async session => { stored = model.serializeSession(session); writes.push(stored) },
      clear: async () => { stored = null },
    },
    openUrl: async url => { opened.push(url) },
  })
  return { flow, calls, opened, writes, stored: () => stored }
}
const posts = (calls, url) => calls.filter(call => call.method === 'POST' && call.url === url)
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }

test('free flow: account, verification, club, plan, venue and done', async () => {
  let verified = false
  const t = setup({ handlers: {
    'POST /onboarding/clubs/start': { sessionId: 's1' },
    'GET /onboarding/clubs/resume': () => resumeRow({ emailVerified: verified, step: verified ? 'CLUB' : 'EMAIL_VERIFICATION' }),
    'POST /onboarding/clubs/tenant': { clubId: 'c1' },
    'POST /onboarding/clubs/plan': { ok: true },
    'POST /onboarding/clubs/complete': { ok: true },
  } })
  await t.flow.open(false)
  assert.equal(t.flow.state.view, 'account')
  await t.flow.start(account)
  assert.equal(t.flow.state.view, 'emailPending')
  assert.deepEqual(posts(t.calls, '/onboarding/clubs/start')[0].body, { email: 'lucia@clubnorte.com', password: SECRET, firstName: 'Lucía', lastName: 'Pérez', platform: 'ANDROID' })
  await t.flow.checkVerified()
  assert.equal(t.flow.state.view, 'emailPending')
  assert.equal(t.flow.state.notVerified, true)
  verified = true
  await t.flow.checkVerified()
  assert.equal(t.flow.state.view, 'emailVerified')
  t.flow.continueFromVerified()
  assert.equal(t.flow.state.view, 'club')
  await t.flow.saveClub('  Club Norte ', location, names)
  assert.deepEqual(posts(t.calls, '/onboarding/clubs/tenant')[0].body, { sessionId: 's1', club: { name: 'Club Norte', location } })
  assert.equal(t.flow.state.view, 'plan')
  assert.equal(t.flow.state.club.location.localityName, 'Rosario')
  await t.flow.continuePlan()
  assert.equal(t.flow.state.view, 'venue')
  assert.equal(posts(t.calls, '/onboarding/clubs/checkout').length, 0, 'FREE never opens a checkout')
  assert.deepEqual(t.opened, [])
  const draft = { name: ' Sede Centro ', courts: [{ key: 'a', name: 'Cancha 1' }, { key: 'b', name: ' Cancha 2 ' }] }
  await t.flow.completeVenue(draft, location)
  assert.deepEqual(posts(t.calls, '/onboarding/clubs/complete')[0].body, {
    sessionId: 's1', venues: [{ name: 'Sede Centro', location }], courts: [{ name: 'Cancha 1', venueIndex: 0 }, { name: 'Cancha 2', venueIndex: 0 }],
  })
  assert.equal(t.flow.state.view, 'done')
  assert.equal(t.flow.state.completedPlan, 'FREE')
  assert.equal(t.stored(), null, 'the saved session is dropped after completion')
})

test('the password is only sent to start and never stored or kept in state', async () => {
  const t = setup({ handlers: { 'POST /onboarding/clubs/start': { sessionId: 's1' } } })
  await t.flow.start(account)
  assert.deepEqual(JSON.parse(t.stored()), { sessionId: 's1', email: 'lucia@clubnorte.com' })
  for (const written of t.writes) assert.ok(!written.includes(SECRET))
  assert.ok(!JSON.stringify(t.flow.state).includes(SECRET))
  assert.equal(model.serializeSession({ sessionId: 'x', email: 'e', password: SECRET }).includes(SECRET), false)
})

test('resume lands on the step reported by the server', async () => {
  const cases = [
    [resumeRow(), 'emailPending'],
    [resumeRow({ emailVerified: true }), 'emailVerified'],
    [resumeRow({ step: 'CLUB', emailVerified: true }), 'club'],
    [resumeRow({ step: 'PLAN', emailVerified: true, club: clubRow }), 'plan'],
    [resumeRow({ step: 'PLAN', emailVerified: true, club: clubRow, selectedPlanCode: 'PRO', paymentStatus: 'OPEN' }), 'payment'],
    [resumeRow({ step: 'VENUE', emailVerified: true, club: clubRow }), 'venue'],
    [resumeRow({ step: 'DONE', emailVerified: true, club: clubRow, subscriptionPlanCode: 'PRO', subscriptionStatus: 'ACTIVE' }), 'done'],
  ]
  for (const [row, view] of cases) {
    const t = setup({ saved: { sessionId: 's1', email: 'lucia@clubnorte.com' }, handlers: { 'GET /onboarding/clubs/resume': row } })
    await t.flow.open(false)
    assert.equal(t.flow.state.view, view, row.step)
    assert.equal(t.calls[0].url, '/onboarding/clubs/resume?sessionId=s1')
    assert.equal(t.calls[0].authed, false)
  }
  const done = setup({ saved: { sessionId: 's1', email: '' }, handlers: { 'GET /onboarding/clubs/resume': cases[6][0] } })
  await done.flow.open(false)
  assert.equal(done.flow.state.completedPlan, 'PRO')
})

test('a bearer resumes without a session id and wins over the stored one', async () => {
  const t = setup({ saved: { sessionId: 'old', email: '' }, handlers: { 'GET /onboarding/clubs/resume': resumeRow({ step: 'VENUE', emailVerified: true, club: clubRow }) } })
  await t.flow.open(true)
  assert.equal(t.calls[0].url, '/onboarding/clubs/resume')
  assert.equal(t.calls[0].authed, true)
  assert.equal(t.flow.state.view, 'venue')
  assert.equal(t.flow.state.club.location.provinceName, 'Santa Fe')
})

test('an expired bearer shows the sign-in screen; an unknown stored session starts from scratch', async () => {
  const expired = setup({ handlers: { 'GET /onboarding/clubs/resume': () => { throw http(401) } } })
  await expired.flow.open(true)
  assert.equal(expired.flow.state.view, 'sessionExpired')
  const gone = setup({ saved: { sessionId: 'gone', email: 'a@b.co' }, handlers: { 'GET /onboarding/clubs/resume': () => { throw http(404) } } })
  await gone.flow.open(false)
  assert.equal(gone.flow.state.view, 'account')
  assert.equal(gone.stored(), null)
  const offline = setup({ saved: { sessionId: 's1', email: '' }, handlers: { 'GET /onboarding/clubs/resume': () => { throw network() } } })
  await offline.flow.open(false)
  assert.equal(offline.flow.state.view, 'resumeError')
  assert.ok(offline.stored(), 'a network failure keeps the saved session')
})

test('resend sends a new link without verifying and goes back to pending', async () => {
  const t = setup({ platform: 'IOS', saved: { sessionId: 's1', email: 'lucia@clubnorte.com' }, handlers: {
    'GET /onboarding/clubs/resume': resumeRow(), 'POST /onboarding/clubs/resend-email': { ok: true },
  } })
  await t.flow.open(false)
  await t.flow.resend()
  assert.deepEqual(posts(t.calls, '/onboarding/clubs/resend-email')[0].body, { sessionId: 's1', email: 'lucia@clubnorte.com', platform: 'IOS' })
  assert.equal(t.flow.state.view, 'emailPending')
  assert.equal(t.flow.state.resent, true)
  assert.equal(t.flow.state.resume.emailVerified, false)
  assert.equal(posts(t.calls, '/onboarding/clubs/verify-email').length, 0)
  const verified = setup({ saved: { sessionId: 's1', email: '' }, handlers: {
    'GET /onboarding/clubs/resume': resumeRow({ emailVerified: true, step: 'EMAIL_VERIFICATION' }), 'POST /onboarding/clubs/resend-email': () => { throw http(409) },
  } })
  await verified.flow.open(false)
  await verified.flow.resend()
  assert.equal(verified.flow.state.view, 'emailVerified', 'an already verified session moves on')
})

test('verification link: success, expired, invalid, network and a single effect for a repeated render', async () => {
  const proof = { sessionId: 's1', email: 'lucia@clubnorte.com', token: 'qa-proof' }
  const ok = setup({ handlers: { 'POST /onboarding/clubs/verify-email': { verified: true } } })
  await Promise.all([ok.flow.verifyLink(proof), ok.flow.verifyLink(proof)])
  assert.equal(posts(ok.calls, '/onboarding/clubs/verify-email').length, 1)
  assert.equal(ok.flow.state.view, 'emailVerified')
  assert.deepEqual(JSON.parse(ok.stored()), { sessionId: 's1', email: 'lucia@clubnorte.com' })
  for (const [status, view] of [[410, 'linkInvalid'], [400, 'linkInvalid'], [404, 'linkInvalid'], [500, 'verifyError']]) {
    const t = setup({ handlers: { 'POST /onboarding/clubs/verify-email': () => { throw http(status) } } })
    await t.flow.verifyLink(proof)
    assert.equal(t.flow.state.view, view, String(status))
  }
  const flaky = setup({ handlers: { 'POST /onboarding/clubs/verify-email': () => { throw network() } } })
  await flaky.flow.verifyLink(proof)
  assert.equal(flaky.flow.state.view, 'verifyError')
  const missing = setup()
  await missing.flow.verifyLink(model.readProof({ sessionId: 's1', token: 'x' }))
  assert.equal(missing.flow.state.view, 'linkInvalid')
  assert.equal(missing.calls.length, 0)
})

test('an expired link can ask for a new one and the retry verifies again', async () => {
  const proof = { sessionId: 's1', email: 'lucia@clubnorte.com', token: 'old' }
  let fail = true
  const t = setup({ handlers: {
    'POST /onboarding/clubs/verify-email': () => { if (fail) throw http(500); return { verified: true } },
    'POST /onboarding/clubs/resend-email': { ok: true },
  } })
  await t.flow.verifyLink(proof)
  assert.equal(t.flow.state.view, 'verifyError')
  fail = false
  await t.flow.retryVerify(proof)
  assert.equal(t.flow.state.view, 'emailVerified')
  const expired = setup({ handlers: { 'POST /onboarding/clubs/verify-email': () => { throw http(410) }, 'POST /onboarding/clubs/resend-email': { ok: true } } })
  await expired.flow.verifyLink(proof)
  assert.equal(expired.flow.state.view, 'linkInvalid')
  await expired.flow.resend()
  assert.equal(expired.flow.state.view, 'emailPending')
  assert.equal(expired.flow.state.resent, true)
})

test('409 on start is an email field error; other failures keep the form and allow a retry', async () => {
  let mode = 409
  const t = setup({ handlers: { 'POST /onboarding/clubs/start': () => { if (mode === 409) throw http(409); if (mode === 500) throw http(500); return { sessionId: 's9' } } } })
  await t.flow.start(account)
  assert.equal(t.flow.state.accountErrors.email, model.EMAIL_TAKEN)
  assert.notEqual(t.flow.state.view, 'emailPending', 'the view does not advance')
  mode = 500
  await t.flow.start(account)
  assert.match(t.flow.state.notice, /No pudimos crear tu cuenta/)
  mode = 0
  await t.flow.start(account)
  assert.equal(t.flow.state.view, 'emailPending')
  assert.equal(t.flow.state.notice, null)
  assert.equal(posts(t.calls, '/onboarding/clubs/start').length, 3)
})

test('409 on the club is a name error and 403 returns to verification', async () => {
  const conflict = setup({ handlers: { 'POST /onboarding/clubs/start': { sessionId: 's1' }, 'POST /onboarding/clubs/tenant': () => { throw http(409) } } })
  await conflict.flow.start(account)
  await conflict.flow.saveClub('Club Norte', location, names)
  assert.equal(conflict.flow.state.clubError, model.CLUB_TAKEN)
  assert.notEqual(conflict.flow.state.view, 'plan')
  const unverified = setup({ handlers: { 'POST /onboarding/clubs/start': { sessionId: 's1' }, 'POST /onboarding/clubs/tenant': () => { throw http(403) } } })
  await unverified.flow.start(account)
  await unverified.flow.saveClub('Club Norte', location, names)
  assert.equal(unverified.flow.state.view, 'emailPending')
  assert.equal(unverified.flow.state.notVerified, true)
})

test('validation blocks the request: account, club name, location and venue', async () => {
  const t = setup({ handlers: { 'POST /onboarding/clubs/start': { sessionId: 's1' } } })
  await t.flow.start({ firstName: '', lastName: ' ', email: 'nope', password: 'short', phone: '' })
  assert.deepEqual(Object.keys(t.flow.state.accountErrors).sort(), ['email', 'firstName', 'lastName', 'password'])
  assert.equal(t.calls.length, 0)
  const started = setup({ handlers: { 'POST /onboarding/clubs/start': { sessionId: 's1' } } })
  await started.flow.start(account)
  await started.flow.saveClub('', location, names)
  assert.equal(started.flow.state.clubError, 'Ingresá el nombre del club.')
  await started.flow.saveClub('Club', undefined, null)
  assert.equal(posts(started.calls, '/onboarding/clubs/tenant').length, 0, 'typing a place is not choosing one')
  await started.flow.completeVenue({ name: '', courts: [{ key: 'a', name: ' ' }] }, location)
  assert.equal(started.flow.state.venueErrors.name, 'Ingresá el nombre de la sede.')
  assert.ok(started.flow.state.venueErrors.courtNames.a)
  await started.flow.completeVenue({ name: 'Sede', courts: [] }, location)
  assert.equal(started.flow.state.venueErrors.courts, 'Agregá al menos una cancha.')
  assert.equal(posts(started.calls, '/onboarding/clubs/complete').length, 0)
  assert.equal(model.validateAccount({ ...account, phone: '' }).email, undefined)
})

test('double submit is locked to one request', async () => {
  const gate = deferred()
  const t = setup({ handlers: { 'POST /onboarding/clubs/start': () => gate.promise } })
  const first = t.flow.start(account)
  const second = t.flow.start(account)
  assert.equal(t.flow.state.busy, 'start')
  await second
  gate.resolve({ sessionId: 's1' })
  await first
  assert.equal(posts(t.calls, '/onboarding/clubs/start').length, 1)
  assert.equal(t.flow.state.busy, null)
  const venueGate = deferred()
  const venue = setup({ handlers: { 'POST /onboarding/clubs/start': { sessionId: 's1' }, 'POST /onboarding/clubs/complete': () => venueGate.promise, 'GET /onboarding/clubs/resume': resumeRow({ step: 'DONE' }) } })
  await venue.flow.start(account)
  const draft = { name: 'Sede', courts: [{ key: 'a', name: 'C1' }] }
  const one = venue.flow.completeVenue(draft, location)
  const two = venue.flow.completeVenue(draft, location)
  venueGate.resolve({})
  await Promise.all([one, two])
  assert.equal(posts(venue.calls, '/onboarding/clubs/complete').length, 1)
})

test('a failed save keeps the draft path open: the same call can be repeated', async () => {
  let fail = true
  const t = setup({ handlers: { 'POST /onboarding/clubs/start': { sessionId: 's1' }, 'POST /onboarding/clubs/complete': () => { if (fail) throw http(500); return {} }, 'GET /onboarding/clubs/resume': resumeRow({ step: 'DONE', subscriptionPlanCode: 'FREE', subscriptionStatus: 'ACTIVE' }) } })
  await t.flow.start(account)
  const draft = { name: 'Sede', courts: [{ key: 'a', name: 'C1' }] }
  await t.flow.completeVenue(draft, location)
  assert.match(t.flow.state.notice, /No pudimos guardar tu sede/)
  assert.notEqual(t.flow.state.view, 'done')
  fail = false
  await t.flow.completeVenue(draft, location)
  assert.equal(t.flow.state.view, 'done')
})

test('paid plans open the provider link once and read the confirmed state afterwards', async () => {
  let payment = 'OPEN'
  let active = false
  const t = setup({ saved: { sessionId: 's1', email: '' }, handlers: {
    'GET /onboarding/clubs/resume': () => resumeRow({ step: 'PLAN', emailVerified: true, club: clubRow, selectedPlanCode: 'PRO', paymentStatus: payment, subscriptionPlanCode: active ? 'PRO' : 'FREE', subscriptionStatus: 'ACTIVE' }),
    'POST /onboarding/clubs/plan': { ok: true },
    'POST /onboarding/clubs/checkout': { url: 'https://pay.example/checkout/1', reference: 'r1' },
  } })
  await t.flow.open(false)
  t.flow.selectPlan('PRO')
  await t.flow.continuePlan()
  assert.deepEqual(posts(t.calls, '/onboarding/clubs/plan')[0].body, { sessionId: 's1', planCode: 'PRO' })
  assert.deepEqual(t.opened, ['https://pay.example/checkout/1'])
  assert.equal(t.flow.state.view, 'payment')
  assert.equal(t.flow.state.payment, 'pending')
  await t.flow.consultPayment()
  assert.equal(t.flow.state.payment, 'pending')
  payment = 'CANCELED'
  await t.flow.consultPayment()
  assert.equal(t.flow.state.payment, 'canceled')
  payment = 'FAILED'
  await t.flow.consultPayment()
  assert.equal(t.flow.state.payment, 'failed')
  payment = 'APPLIED'; active = true
  await t.flow.consultPayment()
  assert.equal(t.flow.state.payment, 'activated')
  t.flow.continueToVenue()
  assert.equal(t.flow.state.view, 'venue')
  assert.equal(posts(t.calls, '/onboarding/clubs/checkout').length, 1, 'the wizard never confirms a charge and does not re-open on its own')
})

test('payment never blocks: continue with FREE and retry open a checkout again', async () => {
  const t = setup({ handlers: {
    'POST /onboarding/clubs/start': { sessionId: 's1' }, 'POST /onboarding/clubs/plan': { ok: true },
    'POST /onboarding/clubs/checkout': { url: 'https://pay.example/c' },
  } })
  await t.flow.start(account)
  t.flow.selectPlan('ELITE')
  await t.flow.continuePlan()
  await t.flow.continuePlan()
  assert.equal(t.opened.length, 2)
  t.flow.continueToVenue()
  assert.equal(t.flow.state.view, 'venue')
  const broken = setup({ handlers: { 'POST /onboarding/clubs/start': { sessionId: 's1' }, 'POST /onboarding/clubs/plan': { ok: true }, 'POST /onboarding/clubs/checkout': () => { throw http(500) } } })
  await broken.flow.start(account)
  broken.flow.selectPlan('PRO')
  await broken.flow.continuePlan()
  assert.match(broken.flow.state.notice, /No pudimos continuar con el plan/)
  assert.deepEqual(broken.opened, [])
})

test('payment status mapping and plan copy', () => {
  const base = { selectedPlanCode: 'PRO', subscriptionPlanCode: 'FREE', subscriptionStatus: 'ACTIVE', paymentStatus: null }
  assert.equal(model.paymentState(base), 'pending')
  assert.equal(model.paymentState({ ...base, paymentStatus: 'OPENING' }), 'pending')
  assert.equal(model.paymentState({ ...base, paymentStatus: 'UNCERTAIN' }), 'pending')
  assert.equal(model.paymentState({ ...base, paymentStatus: 'UNAPPLIED' }), 'failed')
  assert.equal(model.paymentState({ ...base, subscriptionPlanCode: 'PRO' }), 'activated')
  assert.deepEqual(model.PLAN_LINES.FREE, ['Hasta 1 torneo activo', '24 parejas por torneo', '2 categorías', '1 usuario'])
  assert.equal(model.PLAN_LINES.PRO.length, 6)
  assert.equal(model.PLAN_LINES.ELITE[0], 'Sin límites operativos')
  assert.equal(model.planFooter('FREE'), null)
  assert.equal(model.planFooter('PRO'), 'El plan se activa cuando se confirme el pago')
})

test('a legacy club without a catalog location is surfaced as text and not reconciled', () => {
  const parsed = model.parseResume(resumeRow({ step: 'CLUB', club: { name: 'Viejo', city: 'Rosario', countryDivision: 'Santa Fe', country: 'Argentina', location: null } }))
  assert.equal(parsed.club.location, null)
  assert.equal(parsed.club.legacyText, 'Rosario, Santa Fe')
  assert.equal(model.parseResume({ step: 'NOPE' }), null)
})

test('step numbers and deep-link parsing', () => {
  assert.deepEqual(['account', 'emailPending', 'emailVerified', 'club', 'plan', 'payment', 'venue', 'done'].map(view => model.stepNumber(view)), [1, 2, 2, 3, 4, 4, 5, null])
  assert.deepEqual(model.readProof({ sessionId: 's', email: 'a@b.co', token: 't' }), { sessionId: 's', email: 'a@b.co', token: 't' })
  assert.equal(model.readProof({ sessionId: 's', email: 'a@b.co', token: ['t', 'u'] }), null)
  assert.equal(model.parseSavedSession('{bad'), null)
})
