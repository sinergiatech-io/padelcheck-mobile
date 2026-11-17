const { test } = require('node:test')
const assert = require('node:assert/strict')
const plan = require(process.env.PLAN_TEST_MODULE)

const eventId = '11111111-1111-1111-1111-111111111111'
const reference = 'pcabcdef1234567890'

function meter(extra = {}) {
  return { key: 'confirmedEntries', state: 'LIMITED', limit: 120, used: 48, warning: false, reached: false, exceeded: false, ...extra }
}

function subscription(extra = {}) {
  return {
    clubId: 'c1', planCode: 'FREE', status: 'ACTIVE', requestedPlan: null, commercialPeriod: null,
    actions: { fullCheckout: true, requestAdjustmentQuote: false }, ...extra,
  }
}

test('usage separates the effective plan from the stored subscription', () => {
  const parsed = plan.parseUsage({
    clubId: 'c1', planCode: 'FREE', status: 'CANCELED', subscriptionPlanCode: 'PRO',
    plan: { code: 'FREE', name: 'Free', description: null, free: true, features: [], price: null },
    club: {
      activeTournaments: meter({ key: 'activeTournaments', limit: 1, used: 1, reached: true }),
      staffUsers: meter({ key: 'staffUsers', limit: 1, used: 0 }),
    },
    event: null,
  })
  const headline = plan.planHeadline(parsed, plan.parseSubscription(subscription({ planCode: 'PRO', status: 'CANCELED' })))
  assert.equal(headline.title, 'FREE')
  assert.equal(headline.status, 'Suscripción cancelada')
  assert.equal(headline.identity, 'Plan registrado: PRO')
  assert.equal(headline.limitsReady, true)
  assert.equal(parsed.club.activeTournaments.limit, 1)
})

test('a missing subscription row stays active free without a stored plan', () => {
  const parsed = plan.parseUsage({
    clubId: 'c1', planCode: 'FREE', status: 'ACTIVE', subscriptionPlanCode: null,
    plan: { code: 'FREE', name: 'Free', free: true, features: [], price: null },
    club: { activeTournaments: meter({ key: 'activeTournaments', limit: 1, used: 0 }), staffUsers: meter({ key: 'staffUsers', limit: 1, used: 0 }) },
    event: null,
  })
  const headline = plan.planHeadline(parsed, null)
  assert.equal(headline.title, 'FREE')
  assert.equal(headline.status, 'Suscripción activa')
  assert.equal(headline.identity, null)
})

test('meters keep real zero, warning, limit, excess and unlimited distinct', () => {
  const zero = meter({ key: 'staffUsers', limit: 1, used: 0 })
  assert.equal(plan.meterCaption(zero), 'Todavía no hay usuarios staff · 0%')
  const warning = meter({ used: 100, warning: true })
  assert.equal(plan.meterPercent(warning), 83)
  assert.equal(plan.usageBanners({ club: { activeTournaments: meter({ key: 'activeTournaments', used: 1, limit: 4 }), staffUsers: meter({ key: 'staffUsers', used: 2, limit: 5 }) }, event: { confirmedEntries: warning, divisions: meter({ key: 'divisions', used: 2, limit: 5 }) }, planCode: 'PRO' })[0].title, 'Te acercás al límite de parejas')
  const reached = meter({ key: 'activeTournaments', limit: 1, used: 1, warning: false, reached: true })
  assert.match(plan.meterCaption(reached), /Límite del club alcanzado · 100%/)
  const exceeded = meter({ key: 'confirmedEntries', limit: 24, used: 30, warning: false, reached: true, exceeded: true })
  assert.equal(plan.meterCaption(exceeded), 'Se conservan las 30 parejas · 125%')
  const unlimited = meter({ key: 'activeTournaments', state: 'UNLIMITED', limit: null, used: 4, warning: null, reached: null, exceeded: null })
  assert.equal(plan.meterValue(unlimited), 'Ilimitado')
  assert.equal(plan.meterPercent(unlimited), null)
  assert.equal(plan.meterCaption(unlimited), '4 torneos activos · Sin límite')
  assert.equal(plan.parseUsage({
    clubId: 'c1', planCode: 'ELITE', status: 'ACTIVE', subscriptionPlanCode: 'ELITE', plan: null,
    club: { activeTournaments: { ...unlimited, key: 'activeTournaments' }, staffUsers: meter({ key: 'staffUsers', state: 'LIMITED', warning: 'no' }) },
    event: null,
  }), null)
})

test('no event is not zero usage and a late response cannot replace the new context', () => {
  const parsed = plan.parseUsage({
    clubId: 'c1', planCode: 'FREE', status: 'ACTIVE', subscriptionPlanCode: 'FREE', plan: null,
    club: { activeTournaments: meter({ key: 'activeTournaments', limit: 1, used: 0 }), staffUsers: meter({ key: 'staffUsers', limit: 1, used: 0 }) },
    event: null,
  })
  assert.equal(parsed.event, null)
  assert.equal(plan.usagePath('c1', null), '/clubs/c1/billing/usage')
  assert.equal(plan.usagePath('c1', ' '), '/clubs/c1/billing/usage')
  assert.equal(plan.usagePath('c1', eventId), `/clubs/c1/billing/usage?eventId=${eventId}`)
  const current = { epoch: 2, request: 5, eventId }
  assert.equal(plan.acceptResponse({ epoch: 2, request: 4, eventId }, current), false)
  assert.equal(plan.acceptResponse({ epoch: 1, request: 5, eventId: null }, current), false)
  assert.equal(plan.acceptResponse(current, current), true)
  assert.equal(plan.nextEventSelection(eventId, [{ id: eventId, name: 'Copa' }, { id: '22222222-2222-2222-2222-222222222222', name: 'Otro' }]), eventId)
  assert.equal(plan.nextEventSelection(eventId, []), null)
})

test('refresh reads the current context and never starts a payment', () => {
  const reads = plan.planReadRequests('c1', eventId, reference, true)
  assert.deepEqual(reads.map(item => item.method), ['GET', 'GET', 'GET', 'GET'])
  assert.equal(reads.some(item => item.path.includes('/checkout') || item.path.includes('/adjustment') || item.path.includes('/resume')), false)
  assert.match(reads[1].path, /eventId=/)
  assert.match(reads[3].path, /charges\/pcabcdef1234567890/)
})

test('pending payment stays separate and complete payment reuses the requested plan', () => {
  const pending = plan.parseSubscription(subscription({
    requestedPlan: { planCode: 'PRO', status: 'PENDING_PAYMENT', chargeOutcome: 'NONE' },
  }))
  assert.equal(plan.primaryAction(pending, true), 'complete')
  assert.equal(plan.completeUsesAdjustment(pending), false)
  assert.equal(plan.pendingBanner(pending, 'FREE').title, 'PRO pendiente de pago')
  assert.equal(plan.primaryAction(pending, false), null)
  const elite = plan.parseSubscription(subscription({
    planCode: 'PRO', status: 'ACTIVE',
    actions: { fullCheckout: false, requestAdjustmentQuote: true },
    requestedPlan: { planCode: 'ELITE', status: 'PENDING_PAYMENT', chargeOutcome: 'PENDING' },
  }))
  assert.equal(plan.completeUsesAdjustment(elite), true)
  assert.equal(plan.checkoutBody('FREE'), null)
  assert.deepEqual(plan.checkoutBody('PRO'), { planCode: 'PRO' })
})

test('catalog choices do not activate a paid open plan and adjustment is explicit', () => {
  const current = plan.parseSubscription(subscription({
    planCode: 'PRO', status: 'ACTIVE',
    commercialPeriod: { kind: 'PAID', medium: 'MP', planCode: 'PRO', periodStart: '2026-11-01', periodEnd: '2026-12-01', open: true },
    actions: { fullCheckout: true, requestAdjustmentQuote: true },
  }))
  const choices = plan.upgradeChoices(current, [
    { code: 'PRO', name: 'Pro', free: false, features: [], price: { status: 'AVAILABLE', amount: '10000.00', currency: 'ARS', period: 'MONTH' } },
    { code: 'ELITE', name: 'Elite', free: false, features: [], price: { status: 'AVAILABLE', amount: '20000.00', currency: 'ARS', period: 'MONTH' } },
    { code: 'FREE', name: 'Free', free: true, features: [], price: null },
  ])
  assert.deepEqual(choices.map(item => item.kind + item.planCode), ['adjustmentELITE'])
})

test('a changed adjustment snapshot must be confirmed again and a browser close is not a result', () => {
  const quote = { available: true, amount: '5000.00', currency: 'ARS', periodEnd: '2026-12-01', payUntil: '2026-11-18T03:00:00Z' }
  const same = { ...plan.quoteMaterial(quote), periodStart: null }
  assert.equal(plan.materialChanged(plan.quoteMaterial(quote), same), false)
  const changed = plan.chargeMaterial({
    reference, amount: '5100.00', currency: 'ARS', periodStart: '2026-11-01', periodEnd: '2026-12-01',
    confirmed: false, manualResolution: false, status: 'OPEN', terms: {
      amount: '5100.00', currency: 'ARS', periodStart: '2026-11-01', periodEnd: '2026-12-01', payUntil: '2026-11-18T03:00:00Z',
      eliteMonthlyAmount: '20000.00', eliteMonthlyCurrency: 'ARS',
    },
  })
  assert.equal(plan.materialChanged(plan.quoteMaterial(quote), changed), true)
  assert.equal(plan.chargeBanner({ status: 'OPEN', confirmed: false, manualResolution: false }).title, 'Todavía sin confirmación')
  assert.equal(plan.chargeBanner({ status: 'UNAPPLIED', confirmed: false, manualResolution: true }).title, 'Pendiente de resolución manual')
  assert.equal(plan.chargeBanner({ status: 'APPLIED', confirmed: true, manualResolution: false }).title, 'Pago confirmado')
  assert.equal(plan.isSafePaymentUrl('https://pay.example/checkout?token=secret'), false)
  assert.equal(plan.isSafePaymentUrl('https://pay.example/checkout?source=padel'), true)
  assert.equal(plan.isSafePaymentUrl('http://pay.example/checkout'), false)
  assert.equal(plan.resumeAlreadyActive(409), true)
  assert.equal(plan.resumeAlreadyActive(500), false)
})

test('the opaque reference follows only the same user and club', () => {
  const stored = plan.billingAttempt('user', 'club', reference)
  assert.equal(plan.readBillingAttempt(stored, 'user', 'club'), reference)
  assert.equal(plan.readBillingAttempt(stored, 'other', 'club'), null)
  assert.equal(plan.readBillingAttempt(stored, 'user', 'other'), null)
  assert.equal(plan.billingAttempt('user', 'club', 'short'), null)
  assert.equal(plan.isChargeReference(reference), true)
})

test('pending outcome none is not a failure and confirmed does not relabel the active plan', () => {
  const failed = plan.parseSubscription(subscription({ requestedPlan: { planCode: 'PRO', status: 'PENDING_PAYMENT', chargeOutcome: 'FAILED' } }))
  assert.match(plan.pendingBanner(failed, 'FREE').body, /no se confirmó/)
  const none = plan.parseSubscription(subscription({ requestedPlan: { planCode: 'PRO', status: 'PENDING_PAYMENT', chargeOutcome: 'NONE' } }))
  assert.doesNotMatch(plan.pendingBanner(none, 'FREE').body, /no se confirmó|cancel/)
  const confirmed = plan.parseSubscription(subscription({ requestedPlan: { planCode: 'ELITE', status: 'PENDING_PAYMENT', chargeOutcome: 'CONFIRMED' } }))
  assert.match(plan.pendingBanner(confirmed, 'FREE').body, /plan vigente/)
  assert.equal(plan.parseSubscription(subscription({ requestedPlan: { planCode: 'PRO', status: 'PAID', chargeOutcome: 'CONFIRMED' } })).requestedPlan, null)
})
