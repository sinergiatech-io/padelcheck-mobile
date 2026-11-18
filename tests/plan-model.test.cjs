const { test } = require('node:test')
const assert = require('node:assert/strict')
const plan = require(process.env.PLAN_TEST_MODULE)
const { createPlanReads, visibleEventUsage, resumeRead } = require(process.env.PLAN_LOAD_TEST_MODULE)

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
  const rawWarning = plan.parseUsage({
    clubId: 'c1', planCode: 'FREE', status: 'ACTIVE', subscriptionPlanCode: 'FREE', plan: null,
    club: {
      activeTournaments: { key: 'MAX_ACTIVE_TOURNAMENTS', state: 'LIMITED', limit: 5, used: 4, warning: false, reached: false, exceeded: false },
      staffUsers: { key: 'MAX_STAFF_USERS', state: 'LIMITED', limit: 1, used: 0, warning: false, reached: false, exceeded: false },
    },
    event: {
      eventId, confirmedEntries: { key: 'MAX_ENTRIES_PER_EVENT', state: 'LIMITED', limit: 24, used: 20, warning: true, reached: false, exceeded: false },
      divisions: { key: 'MAX_DIVISIONS_PER_EVENT', state: 'LIMITED', limit: 2, used: 0, warning: false, reached: false, exceeded: false },
    },
  })
  assert.equal(rawWarning.club.activeTournaments.key, 'activeTournaments')
  assert.equal(rawWarning.event.confirmedEntries.key, 'confirmedEntries')
  assert.equal(plan.usageBanners(rawWarning)[0].title, 'Te acercás al límite de parejas')
  rawWarning.event = null
  rawWarning.club.activeTournaments.warning = true
  assert.equal(plan.usageBanners(rawWarning)[0].title, 'Te acercás al límite de torneos activos')
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

test('catalog choices accept only a published monthly price', () => {
  const current = plan.parseSubscription(subscription({
    planCode: 'FREE', status: 'ACTIVE',
    actions: { fullCheckout: true, requestAdjustmentQuote: false },
  }))
  const offers = [
    { code: 'PRO', name: 'Pro', free: false, features: [], price: { status: 'AVAILABLE', amount: '10000.00', currency: 'ARS', period: 'YEAR' } },
    { code: 'ELITE', name: 'Elite', free: false, features: [], price: { status: 'PENDING', amount: null, currency: null, period: null } },
    { code: 'PRO', name: 'Pro mensual', free: false, features: [], price: { status: 'AVAILABLE', amount: '10000.00', currency: 'ARS', period: 'MONTH' } },
  ]
  const choices = plan.upgradeChoices(current, offers)
  assert.deepEqual(choices.map(item => `${item.kind}:${item.planCode}:${item.amount ?? ''}`), ['checkout:PRO:10000.00'])
  const pending = plan.parseSubscription(subscription({
    requestedPlan: { planCode: 'ELITE', status: 'PENDING_PAYMENT', chargeOutcome: 'NONE' },
    actions: { fullCheckout: true, requestAdjustmentQuote: false },
  }))
  assert.equal(plan.completeChoice(pending, offers).kind, 'unavailable')
  const proPending = plan.parseSubscription(subscription({
    requestedPlan: { planCode: 'PRO', status: 'PENDING_PAYMENT', chargeOutcome: 'NONE' },
    actions: { fullCheckout: true, requestAdjustmentQuote: false },
  }))
  const complete = plan.completeChoice(proPending, offers)
  assert.equal(complete.kind, 'checkout')
  if (complete.kind === 'checkout') assert.equal(complete.choice.amount, '10000.00')
})

test('a resume conflict is reread, and another 409 is not treated as an active renewal', () => {
  assert.equal(plan.conflictOutcome('resume', 409), 'reread-resume')
  assert.equal(plan.conflictOutcome('checkout', 409), 'recoverable')
  assert.equal(plan.conflictOutcome('quote', 409), 'recoverable')
  assert.equal(plan.conflictOutcome('resume', 500), null)
  assert.equal(plan.resumeConfirmation(plan.parseSubscription(subscription({ recurrenceStatus: 'ALIGNED', recurrencePaused: false, recurrenceResumeAction: null }))), 'resumed')
  assert.equal(plan.resumeConfirmation(plan.parseSubscription(subscription({ recurrenceStatus: 'PENDING', recurrencePaused: false, recurrenceResumeAction: null }))), 'unknown')
  assert.equal(plan.resumeConfirmation(plan.parseSubscription(subscription({ recurrencePaused: false, recurrenceResumeAction: null }))), 'unknown')
  assert.equal(plan.resumeConfirmation(plan.parseSubscription(subscription({ recurrencePaused: true, recurrenceResumeAction: 'RESUME_RENEWAL' }))), 'pending')
  assert.equal(plan.resumeConfirmation(null), 'unknown')
})

test('opening a link rereads the same charge and refuses an expired, canceled or foreign result', () => {
  const link = { clubId: 'c1', planCode: 'ELITE', amount: '5000.00', currency: 'ARS', url: 'https://billing.test/checkout/pcabcdef1234567890', reference }
  const charge = {
    reference, kind: 'ADJUSTMENT', planCode: 'ELITE', status: 'OPEN', amount: '5000.00', currency: 'ARS',
    periodStart: '2026-11-01', periodEnd: '2026-12-01', confirmed: false, manualResolution: false,
    terms: { amount: '5000.00', currency: 'ARS', periodStart: '2026-11-01', periodEnd: '2026-12-01', payUntil: '2026-11-18T03:00:00Z', eliteMonthlyAmount: '20000.00', eliteMonthlyCurrency: 'ARS' },
  }
  const shown = plan.chargeMaterial(charge)
  const now = Date.parse('2026-11-17T12:00:00Z')
  assert.equal(plan.decideOpen({ clubId: 'c1', link, charge, readFailed: false, shown, nowMs: now }).kind, 'open')
  assert.equal(plan.decideOpen({ clubId: 'c1', link, charge, readFailed: false, shown, nowMs: Date.parse('2026-11-18T03:00:00Z') }).kind, 'expired')
  assert.equal(plan.decideOpen({ clubId: 'c1', link, charge, readFailed: false, shown, nowMs: Date.parse('2026-11-18T03:00:00Z') }).requote, true)
  assert.equal(plan.decideOpen({ clubId: 'c1', link, charge: { ...charge, status: 'APPLIED', confirmed: true }, readFailed: false, shown, nowMs: now }).kind, 'applied')
  assert.equal(plan.decideOpen({ clubId: 'c1', link, charge: { ...charge, status: 'CANCELED' }, readFailed: false, shown, nowMs: now }).kind, 'canceled')
  assert.equal(plan.decideOpen({ clubId: 'c1', link, charge: { ...charge, status: 'UNCERTAIN' }, readFailed: false, shown, nowMs: now }).kind, 'uncertain')
  assert.equal(plan.decideOpen({ clubId: 'other', link, charge, readFailed: false, shown, nowMs: now }).kind, 'mismatch')
  assert.equal(plan.decideOpen({ clubId: 'c1', link, charge: null, readFailed: true, shown, nowMs: now }).kind, 'unavailable')
  assert.equal(plan.sameServerUrl(link.url, 'https://billing.test/checkout/other'), false)
  assert.equal(plan.sameServerUrl(link.url, link.url), true)
})

test('advanced stats stay marked as later work even when the plan enables them', () => {
  const lines = plan.capabilityLines({
    code: 'PRO', name: 'Pro', free: false, features: [
      { key: 'ADVANCED_STATS', state: 'ENABLED' },
      { key: 'CUSTOM_BRANDING', state: 'ENABLED' },
      { key: 'PRIORITY_SUPPORT', state: 'DISABLED' },
    ], price: null,
  })
  assert.deepEqual(lines, ['Estadísticas avanzadas · Post-MVP', 'Marca personalizada', 'Soporte estándar'])
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

function deferred() {
  let resolve
  let reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

function subscriptionBody(clubId) {
  return {
    clubId, planCode: 'FREE', status: 'ACTIVE', actions: { fullCheckout: false, requestAdjustmentQuote: false },
  }
}

function usageBody(clubId) {
  return {
    clubId, planCode: 'FREE', status: 'ACTIVE', subscriptionPlanCode: 'FREE', plan: null,
    club: {
      activeTournaments: { key: 'activeTournaments', state: 'LIMITED', limit: 1, used: 0, warning: false, reached: false, exceeded: false },
      staffUsers: { key: 'staffUsers', state: 'LIMITED', limit: 1, used: 0, warning: false, reached: false, exceeded: false },
    },
    event: null,
  }
}

test('a club change does not join the previous refresh or keep its result', async () => {
  const first = deferred()
  const second = deferred()
  const calls = []
  const client = {
    loadAttempt: async () => null,
    saveAttempt: async () => {},
    events: async () => [],
    charge: async () => { throw new Error('no charge') },
    subscription: (clubId) => {
      calls.push(clubId)
      return clubId === 'club-a' ? first.promise : second.promise
    },
    usage: async (clubId) => usageBody(clubId),
  }
  const session = createPlanReads(client)
  const context = (clubId) => ({ clubId, userId: 'user', listEvents: false, enabled: true })
  const older = session.refresh(context('club-a'))
  await Promise.resolve()
  session.reset()
  const newer = session.refresh(context('club-b'))
  await Promise.resolve()
  first.resolve(subscriptionBody('club-a'))
  await older
  assert.equal(session.snapshot().subscription, null)
  assert.equal(session.snapshot().loading, true)
  second.resolve(subscriptionBody('club-b'))
  await newer
  assert.equal(session.snapshot().subscription.clubId, 'club-b')
  assert.equal(session.snapshot().loading, false)
  assert.equal(session.snapshot().refreshing, false)
  assert.deepEqual(calls, ['club-a', 'club-b'])
})

test('the same context joins one refresh and a revoked context clears it', async () => {
  const gate = deferred()
  let calls = 0
  const client = {
    loadAttempt: async () => null,
    saveAttempt: async () => {},
    events: async () => [],
    charge: async () => { throw Object.assign(new Error('missing'), { status: 404 }) },
    subscription: () => { calls += 1; return gate.promise },
    usage: async (clubId) => usageBody(clubId),
  }
  const session = createPlanReads(client)
  const context = { clubId: 'club-a', userId: 'user', listEvents: false, enabled: true }
  const first = session.refresh(context)
  const joined = session.refresh(context)
  assert.equal(first, joined)
  gate.resolve(subscriptionBody('club-a'))
  await first
  assert.equal(calls, 1)
  assert.equal(session.snapshot().subscription.clubId, 'club-a')
  session.reset()
  assert.equal(session.snapshot().subscription, null)
  assert.equal(session.snapshot().loading, false)
})

function eventUsage(clubId, eventId, pairs) {
  return {
    ...usageBody(clubId),
    event: {
      eventId,
      status: 'DRAFT',
      confirmedEntries: { key: 'confirmedEntries', state: 'LIMITED', limit: 24, used: pairs, warning: false, reached: false, exceeded: false },
      divisions: { key: 'divisions', state: 'LIMITED', limit: 2, used: 1, warning: false, reached: false, exceeded: false },
    },
  }
}

test('changing tournament hides the previous event until its own usage arrives', async () => {
  const eventA = '11111111-1111-1111-1111-111111111111'
  const eventB = '22222222-2222-2222-2222-222222222222'
  const second = deferred()
  let failNext = false
  const client = {
    loadAttempt: async () => null,
    saveAttempt: async () => {},
    events: async () => [{ id: eventA, name: 'Copa A' }, { id: eventB, name: 'Copa B' }],
    charge: async () => { throw Object.assign(new Error('missing'), { status: 404 }) },
    subscription: async () => {
      if (failNext) throw Object.assign(new Error('down'), { kind: 'network' })
      return { ...subscriptionBody('club-a'), recurrenceStatus: 'ALIGNED', recurrencePaused: false, recurrenceResumeAction: null }
    },
    usage: async (clubId, eventId) => eventId === eventB ? second.promise : eventUsage(clubId, eventA, 10),
  }
  const session = createPlanReads(client)
  const context = { clubId: 'club-a', userId: 'user', listEvents: true, enabled: true }
  await session.refresh(context)
  assert.equal(visibleEventUsage(session.snapshot()).confirmedEntries.used, 10)
  assert.equal(resumeRead(session.snapshot()), 'resumed')
  const pending = session.selectEvent(context, eventB)
  await Promise.resolve()
  assert.equal(session.snapshot().eventId, eventB)
  assert.equal(visibleEventUsage(session.snapshot()), null)
  assert.equal(session.snapshot().usage.club.activeTournaments.used, 0)
  second.resolve(eventUsage('club-a', eventB, 30))
  await pending
  assert.equal(visibleEventUsage(session.snapshot()).confirmedEntries.used, 30)
  client.usage = async () => { throw Object.assign(new Error('down'), { kind: 'network' }) }
  await session.selectEvent(context, eventA)
  assert.equal(session.snapshot().eventId, eventA)
  assert.equal(visibleEventUsage(session.snapshot()), null)
  assert.equal(session.snapshot().usageError, 'network')
  assert.equal(session.snapshot().usage.club.staffUsers.used, 0)
  failNext = true
  await session.refresh(context)
  assert.equal(session.snapshot().fresh, false)
  assert.equal(resumeRead(session.snapshot()), 'unknown')
  assert.equal(session.snapshot().subscription.recurrencePaused, false)
})

