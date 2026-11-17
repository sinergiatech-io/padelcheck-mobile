/** Pure billing presentation and request rules for the club plan panel. */

export type PlanCode = string
export type MeterState = 'LIMITED' | 'UNLIMITED' | 'ABSENT'
export type ChargeStatus = 'OPENING' | 'OPEN' | 'UNCERTAIN' | 'APPLIED' | 'UNAPPLIED' | 'FAILED' | 'CANCELED'
export type ChargeOutcome = 'NONE' | 'PENDING' | 'FAILED' | 'CANCELED' | 'CONFIRMED'

export interface UsageMeter {
  key: string
  state: MeterState
  limit: number | null
  used: number
  warning: boolean | null
  reached: boolean | null
  exceeded: boolean | null
}

export interface PlanFeature {
  key: string
  state: string
}

export interface PlanOffer {
  code: string
  name: string
  description: string | null
  free: boolean
  features: PlanFeature[]
  price: { status: string; amount: string | null; currency: string | null; period: string | null } | null
}

export interface RequestedPlan {
  planCode: string
  status: string
  chargeOutcome: ChargeOutcome | null
}

export interface CommercialPeriod {
  kind: string
  medium: string | null
  planCode: string | null
  periodStart: string | null
  periodEnd: string | null
  open: boolean
}

export interface BillingActions {
  fullCheckout: boolean
  requestAdjustmentQuote: boolean
}

export interface ClubSubscription {
  clubId: string
  planCode: string
  status: string
  periodEnd: string | null
  recurrencePaused: boolean | null
  recurrenceMessage: string | null
  recurrenceResumeAction: 'RESUME_RENEWAL' | 'AUTHORIZE_RENEWAL' | null
  recurrenceAuthorizationUrl: string | null
  requestedPlan: RequestedPlan | null
  commercialPeriod: CommercialPeriod | null
  actions: BillingActions
}

export interface ClubUsage {
  clubId: string
  planCode: string
  status: string
  subscriptionPlanCode: string | null
  plan: PlanOffer | null
  club: { activeTournaments: UsageMeter; staffUsers: UsageMeter }
  event: { eventId: string; status: string | null; confirmedEntries: UsageMeter; divisions: UsageMeter } | null
}

export interface ChargeTerms {
  reference: string | null
  amount: string | null
  currency: string | null
  periodStart: string | null
  periodEnd: string | null
  payUntil: string | null
  eliteMonthlyAmount: string | null
  eliteMonthlyCurrency: string | null
  status: string | null
}

export interface BillingCharge {
  reference: string
  kind: string | null
  planCode: string | null
  status: string | null
  amount: string | null
  currency: string | null
  periodStart: string | null
  periodEnd: string | null
  confirmed: boolean
  manualResolution: boolean
  terms: ChargeTerms | null
}

export interface AdjustmentQuote {
  available: boolean
  amount: string | null
  currency: string | null
  periodEnd: string | null
  payUntil: string | null
}

export interface CheckoutLink {
  clubId: string
  planCode: string
  amount: string | null
  currency: string | null
  url: string
  reference: string
}

export interface ResumePreview {
  amount: string | null
  currency: string | null
  nextDebitDay: string | null
  chargesCurrentPeriod: boolean
  sameRecurrence: boolean
  resumed: boolean
  payerAuthorizationUrl: string | null
  message: string | null
}

export interface ClubEventOption {
  id: string
  name: string
}

export interface MaterialTerms {
  amount: string | null
  currency: string | null
  periodStart: string | null
  periodEnd: string | null
  payUntil: string | null
  eliteMonthlyAmount: string | null
  eliteMonthlyCurrency: string | null
}

export interface ReadRequest {
  method: 'GET'
  path: string
}

export type UpgradeChoice =
  | { kind: 'checkout'; planCode: 'PRO' | 'ELITE'; name: string; amount: string | null; currency: string | null }
  | { kind: 'adjustment'; planCode: 'ELITE'; name: string }

const PLAN_CODE = /^[A-Z][A-Z0-9_]{0,19}$/
const STATUS_CODE = /^[A-Z][A-Z0-9_]{0,39}$/
const EVENT_ID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const CHARGE_REFERENCE = /^[A-Za-z0-9_-]{8,80}$/
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function code(value: unknown, pattern: RegExp): string | null {
  return typeof value === 'string' && pattern.test(value) ? value : null
}

function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function money(value: unknown): string | null {
  return typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) ? value : null
}

function dateText(value: unknown): string | null {
  return typeof value === 'string' && DATE.test(value) ? value : null
}

function instantText(value: unknown): string | null {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null
  return value
}

export function isEventId(value: string | null | undefined): value is string {
  return typeof value === 'string' && EVENT_ID.test(value)
}

export function isChargeReference(value: string | null | undefined): value is string {
  return typeof value === 'string' && CHARGE_REFERENCE.test(value)
}

function meter(value: unknown): UsageMeter | null {
  const source = record(value)
  if (!source) return null
  const state = source.state
  if (state !== 'LIMITED' && state !== 'UNLIMITED' && state !== 'ABSENT') return null
  if (typeof source.used !== 'number' || !Number.isFinite(source.used) || source.used < 0) return null
  const limit = state === 'LIMITED' ? source.limit : null
  if (state === 'LIMITED' && (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 0)) return null
  if (state !== 'LIMITED' && source.limit != null) return null
  const flag = (name: 'warning' | 'reached' | 'exceeded'): boolean | null => {
    const current = source[name]
    if (current == null) return null
    return typeof current === 'boolean' ? current : null
  }
  if (state !== 'LIMITED' && (source.warning != null || source.reached != null || source.exceeded != null)) return null
  if (state === 'LIMITED' && ['warning', 'reached', 'exceeded'].some(name => source[name] != null && typeof source[name] !== 'boolean')) return null
  return {
    key: text(source.key) ?? '',
    state,
    limit: state === 'LIMITED' ? limit as number : null,
    used: source.used,
    warning: flag('warning'),
    reached: flag('reached'),
    exceeded: flag('exceeded'),
  }
}

function feature(value: unknown): PlanFeature | null {
  const source = record(value)
  if (!source) return null
  const key = text(source.key)
  const state = text(source.state)
  if (!key || !state) return null
  return { key, state }
}

export function parsePlanOffer(value: unknown): PlanOffer | null {
  const source = record(value)
  if (!source) return null
  const codeValue = code(source.code, PLAN_CODE)
  const name = text(source.name)
  if (!codeValue || !name || typeof source.free !== 'boolean') return null
  const features = Array.isArray(source.features) ? source.features.map(feature) : []
  if (features.some(item => item === null)) return null
  const priceSource = source.price == null ? null : record(source.price)
  if (source.price != null && !priceSource) return null
  const price = priceSource ? {
    status: text(priceSource.status) ?? '',
    amount: money(priceSource.amount),
    currency: text(priceSource.currency),
    period: text(priceSource.period),
  } : null
  if (price && !price.status) return null
  return { code: codeValue, name, description: text(source.description), free: source.free, features: features as PlanFeature[], price }
}

export function parseSubscription(value: unknown): ClubSubscription | null {
  const source = record(value)
  if (!source) return null
  const clubId = text(source.clubId)
  const planCode = code(source.planCode, PLAN_CODE)
  const status = code(source.status, STATUS_CODE)
  if (!clubId || !planCode || !status) return null
  const requestedSource = source.requestedPlan == null ? null : record(source.requestedPlan)
  if (source.requestedPlan != null && !requestedSource) return null
  let requestedPlan: RequestedPlan | null = null
  if (requestedSource) {
    const requestedCode = code(requestedSource.planCode, PLAN_CODE)
    const requestedStatus = code(requestedSource.status, STATUS_CODE)
    const outcome = requestedSource.chargeOutcome == null ? null : code(requestedSource.chargeOutcome, STATUS_CODE)
    if (!requestedCode || !requestedStatus) return null
    if (requestedStatus === 'PENDING_PAYMENT') {
      requestedPlan = {
        planCode: requestedCode,
        status: requestedStatus,
        chargeOutcome: outcome === 'NONE' || outcome === 'PENDING' || outcome === 'FAILED' || outcome === 'CANCELED' || outcome === 'CONFIRMED' ? outcome : null,
      }
    }
  }
  const periodSource = source.commercialPeriod == null ? null : record(source.commercialPeriod)
  if (source.commercialPeriod != null && !periodSource) return null
  const commercialPeriod = periodSource ? {
    kind: code(periodSource.kind, STATUS_CODE) ?? '',
    medium: text(periodSource.medium),
    planCode: code(periodSource.planCode, PLAN_CODE),
    periodStart: dateText(periodSource.periodStart),
    periodEnd: dateText(periodSource.periodEnd),
    open: periodSource.open === true,
  } : null
  if (commercialPeriod && !commercialPeriod.kind) return null
  const actionSource = source.actions == null ? null : record(source.actions)
  if (source.actions != null && !actionSource) return null
  const actions = {
    fullCheckout: actionSource?.fullCheckout === true,
    requestAdjustmentQuote: actionSource?.requestAdjustmentQuote === true,
  }
  const resume = source.recurrenceResumeAction
  return {
    clubId,
    planCode,
    status,
    periodEnd: dateText(source.periodEnd),
    recurrencePaused: bool(source.recurrencePaused),
    recurrenceMessage: text(source.recurrenceMessage),
    recurrenceResumeAction: resume === 'RESUME_RENEWAL' || resume === 'AUTHORIZE_RENEWAL' ? resume : null,
    recurrenceAuthorizationUrl: text(source.recurrenceAuthorizationUrl),
    requestedPlan,
    commercialPeriod,
    actions,
  }
}

export function parseUsage(value: unknown): ClubUsage | null {
  const source = record(value)
  if (!source) return null
  const clubId = text(source.clubId)
  const planCode = code(source.planCode, PLAN_CODE)
  const status = code(source.status, STATUS_CODE)
  const stored = source.subscriptionPlanCode == null ? null : code(source.subscriptionPlanCode, PLAN_CODE)
  if (!clubId || !planCode || !status || (source.subscriptionPlanCode != null && !stored)) return null
  const plan = source.plan == null ? null : parsePlanOffer(source.plan)
  if (source.plan != null && !plan) return null
  const club = record(source.club)
  const activeTournaments = meter(club?.activeTournaments)
  const staffUsers = meter(club?.staffUsers)
  if (!activeTournaments || !staffUsers) return null
  if (source.event == null) {
    return { clubId, planCode, status, subscriptionPlanCode: stored, plan, club: { activeTournaments, staffUsers }, event: null }
  }
  const event = record(source.event)
  const eventId = text(event?.eventId)
  const confirmedEntries = meter(event?.confirmedEntries)
  const divisions = meter(event?.divisions)
  if (!eventId || !confirmedEntries || !divisions) return null
  return {
    clubId,
    planCode,
    status,
    subscriptionPlanCode: stored,
    plan,
    club: { activeTournaments, staffUsers },
    event: { eventId, status: text(event?.status), confirmedEntries, divisions },
  }
}

export function parseCharge(value: unknown): BillingCharge | null {
  const source = record(value)
  if (!source || !isChargeReference(text(source.reference) ?? undefined)) return null
  const termsSource = source.terms == null ? null : record(source.terms)
  if (source.terms != null && !termsSource) return null
  const terms = termsSource ? {
    reference: text(termsSource.reference),
    amount: money(termsSource.amount),
    currency: text(termsSource.currency),
    periodStart: dateText(termsSource.periodStart),
    periodEnd: dateText(termsSource.periodEnd),
    payUntil: instantText(termsSource.payUntil),
    eliteMonthlyAmount: money(termsSource.eliteMonthlyAmount),
    eliteMonthlyCurrency: text(termsSource.eliteMonthlyCurrency),
    status: text(termsSource.status),
  } : null
  return {
    reference: text(source.reference) as string,
    kind: text(source.kind),
    planCode: code(source.planCode, PLAN_CODE),
    status: code(source.status, STATUS_CODE),
    amount: money(source.amount),
    currency: text(source.currency),
    periodStart: dateText(source.periodStart),
    periodEnd: dateText(source.periodEnd),
    confirmed: source.confirmed === true,
    manualResolution: source.manualResolution === true,
    terms,
  }
}

export function parseQuote(value: unknown): AdjustmentQuote | null {
  const source = record(value)
  if (!source || typeof source.available !== 'boolean') return null
  return {
    available: source.available,
    amount: money(source.amount),
    currency: text(source.currency),
    periodEnd: dateText(source.periodEnd),
    payUntil: instantText(source.payUntil),
  }
}

export function parseCheckoutLink(value: unknown): CheckoutLink | null {
  const source = record(value)
  if (!source) return null
  const clubId = text(source.clubId)
  const planCode = source.planCode === 'PRO' || source.planCode === 'ELITE' ? source.planCode : null
  const url = text(source.url)
  const reference = text(source.reference)
  if (!clubId || !planCode || !url || !isChargeReference(reference ?? undefined)) return null
  return { clubId, planCode, amount: money(source.amount), currency: text(source.currency), url, reference: reference as string }
}

export function parseResumePreview(value: unknown): ResumePreview | null {
  const source = record(value)
  if (!source) return null
  if (typeof source.chargesCurrentPeriod !== 'boolean' || typeof source.sameRecurrence !== 'boolean' || typeof source.resumed !== 'boolean') return null
  return {
    amount: money(source.amount),
    currency: text(source.currency),
    nextDebitDay: dateText(source.nextDebitDay),
    chargesCurrentPeriod: source.chargesCurrentPeriod,
    sameRecurrence: source.sameRecurrence,
    resumed: source.resumed,
    payerAuthorizationUrl: text(source.payerAuthorizationUrl),
    message: text(source.message),
  }
}

export function parseEvents(value: unknown): ClubEventOption[] | null {
  if (!Array.isArray(value)) return null
  const events: ClubEventOption[] = []
  for (const item of value) {
    const source = record(item)
    const id = text(source?.id)
    const name = text(source?.name)
    if (!id || !name || !isEventId(id)) return null
    events.push({ id, name })
  }
  return events
}

export function parseCatalog(value: unknown): PlanOffer[] | null {
  if (!Array.isArray(value)) return null
  const offers: PlanOffer[] = []
  for (const item of value) {
    const offer = parsePlanOffer(item)
    if (!offer) return null
    offers.push(offer)
  }
  return offers
}

export function usagePath(clubId: string, eventId: string | null): string {
  const base = `/clubs/${encodeURIComponent(clubId)}/billing/usage`
  if (!isEventId(eventId)) return base
  return `${base}?eventId=${encodeURIComponent(eventId)}`
}

export function planReadRequests(clubId: string, eventId: string | null, reference: string | null, includeEvents: boolean): ReadRequest[] {
  const reads: ReadRequest[] = [
    { method: 'GET', path: `/clubs/${encodeURIComponent(clubId)}/billing/subscription` },
    { method: 'GET', path: usagePath(clubId, eventId) },
  ]
  if (includeEvents) reads.push({ method: 'GET', path: `/clubs/${encodeURIComponent(clubId)}/events` })
  if (isChargeReference(reference ?? undefined)) {
    reads.push({ method: 'GET', path: `/clubs/${encodeURIComponent(clubId)}/billing/charges/${encodeURIComponent(reference as string)}` })
  }
  return reads
}

export function checkoutBody(planCode: string): { planCode: 'PRO' | 'ELITE' } | null {
  return planCode === 'PRO' || planCode === 'ELITE' ? { planCode } : null
}

export function isSafePaymentUrl(value: string | null | undefined): value is string {
  if (!value) return false
  let url: URL
  try { url = new URL(value) } catch { return false }
  if (url.protocol !== 'https:' || url.username || url.password) return false
  for (const key of url.searchParams.keys()) {
    if (/token|jwt|authorization|bearer/i.test(key)) return false
  }
  return true
}

export function normalizeMoney(value: string | null): string | null {
  if (value == null || !/^-?\d+(\.\d+)?$/.test(value)) return value
  const negative = value.startsWith('-')
  const unsigned = negative ? value.slice(1) : value
  const [whole, fraction = ''] = unsigned.split('.')
  const trimmed = fraction.replace(/0+$/, '')
  const canonical = trimmed.length === 0 ? whole : `${whole}.${trimmed}`
  return negative ? `-${canonical}` : canonical
}

export function quoteMaterial(quote: AdjustmentQuote): MaterialTerms {
  return {
    amount: quote.amount,
    currency: quote.currency,
    periodStart: null,
    periodEnd: quote.periodEnd,
    payUntil: quote.payUntil,
    eliteMonthlyAmount: null,
    eliteMonthlyCurrency: null,
  }
}

export function chargeMaterial(charge: BillingCharge): MaterialTerms {
  return {
    amount: charge.terms?.amount ?? charge.amount,
    currency: charge.terms?.currency ?? charge.currency,
    periodStart: charge.terms?.periodStart ?? charge.periodStart,
    periodEnd: charge.terms?.periodEnd ?? charge.periodEnd,
    payUntil: charge.terms?.payUntil ?? null,
    eliteMonthlyAmount: charge.terms?.eliteMonthlyAmount ?? null,
    eliteMonthlyCurrency: charge.terms?.eliteMonthlyCurrency ?? null,
  }
}

export function materialChanged(consented: MaterialTerms, next: MaterialTerms): boolean {
  const keys: (keyof MaterialTerms)[] = ['amount', 'currency', 'periodStart', 'periodEnd', 'payUntil', 'eliteMonthlyAmount', 'eliteMonthlyCurrency']
  return keys.some(key => {
    const left = key === 'amount' || key === 'eliteMonthlyAmount' ? normalizeMoney(consented[key]) : consented[key]
    const right = key === 'amount' || key === 'eliteMonthlyAmount' ? normalizeMoney(next[key]) : next[key]
    return (left ?? null) !== (right ?? null)
  })
}

export function catalogMaterial(planCode: 'PRO' | 'ELITE', amount: string | null, currency: string | null): MaterialTerms {
  return { amount, currency, periodStart: null, periodEnd: null, payUntil: null, eliteMonthlyAmount: null, eliteMonthlyCurrency: null }
}

export function linkMaterial(link: CheckoutLink): MaterialTerms {
  return { amount: link.amount, currency: link.currency, periodStart: null, periodEnd: null, payUntil: null, eliteMonthlyAmount: null, eliteMonthlyCurrency: null }
}

export interface ResponseContext {
  epoch: number
  request: number
  eventId: string | null
}

export function acceptResponse(attempt: ResponseContext, current: ResponseContext): boolean {
  return attempt.epoch === current.epoch && attempt.request === current.request && attempt.eventId === current.eventId
}

export function nextEventSelection(previous: string | null, events: ClubEventOption[]): string | null {
  if (previous && events.some(event => event.id === previous)) return previous
  return events[0]?.id ?? null
}

export function meterPercent(meterValue: UsageMeter): number | null {
  if (meterValue.state !== 'LIMITED' || meterValue.limit == null || meterValue.limit <= 0) return null
  return Math.round((meterValue.used / meterValue.limit) * 100)
}

const METER_LABEL: Record<string, string> = {
  activeTournaments: 'Torneos activos',
  staffUsers: 'Usuarios staff',
  confirmedEntries: 'Parejas confirmadas',
  divisions: 'Divisiones',
}

export function meterLabel(key: string): string {
  return METER_LABEL[key] ?? key
}

export function meterValue(meterValue: UsageMeter): string {
  if (meterValue.state === 'UNLIMITED') return 'Ilimitado'
  if (meterValue.state === 'ABSENT') return ''
  return `${meterValue.used} / ${meterValue.limit ?? 0}`
}

function countLabel(used: number, singular: string, plural: string): string {
  return `${used} ${used === 1 ? singular : plural}`
}

export function meterCaption(meterValue: UsageMeter): string {
  if (meterValue.state === 'ABSENT') return ''
  if (meterValue.state === 'UNLIMITED') {
    if (meterValue.key === 'activeTournaments') return `${countLabel(meterValue.used, 'torneo activo', 'torneos activos')} · Sin límite`
    if (meterValue.key === 'staffUsers') return `${countLabel(meterValue.used, 'usuario staff', 'usuarios staff')} · Sin límite`
    if (meterValue.key === 'confirmedEntries') return `${countLabel(meterValue.used, 'pareja confirmada', 'parejas confirmadas')} en el torneo`
    if (meterValue.key === 'divisions') return `${countLabel(meterValue.used, 'división', 'divisiones')} del torneo`
    return `${meterValue.used} · Sin límite`
  }
  const percent = meterPercent(meterValue)
  const percentText = percent == null ? '' : ` · ${percent}%`
  if (meterValue.exceeded) {
    if (meterValue.key === 'confirmedEntries') return `Se conservan las ${meterValue.used} parejas${percentText}`
    return `Uso superior al nuevo límite${percentText}`
  }
  if (meterValue.reached) {
    if (meterValue.key === 'activeTournaments' || meterValue.key === 'staffUsers') return `Límite del club alcanzado${percentText}`
    return `Límite del torneo alcanzado${percentText}`
  }
  if (meterValue.used === 0) {
    if (meterValue.key === 'activeTournaments') return `Todavía no hay torneos activos${percentText}`
    if (meterValue.key === 'staffUsers') return `Todavía no hay usuarios staff${percentText}`
    if (meterValue.key === 'confirmedEntries') return `Ninguna pareja confirmada${percentText}`
    if (meterValue.key === 'divisions') return `Todavía no hay divisiones${percentText}`
  }
  if (meterValue.key === 'activeTournaments') return `${countLabel(meterValue.used, 'torneo activo', 'torneos activos')}${percentText}`
  if (meterValue.key === 'staffUsers') return `${countLabel(meterValue.used, 'usuario staff', 'usuarios staff')}${percentText}`
  if (meterValue.key === 'confirmedEntries') return `Todas las divisiones del torneo${percentText}`
  if (meterValue.key === 'divisions') return `Divisiones del torneo${percentText}`
  return `${meterValue.used}${percentText}`
}

export function statusLabel(status: string, activeWord = true): string {
  if (status === 'ACTIVE') return activeWord ? 'Suscripción activa' : 'Activa'
  if (status === 'TRIALING') return 'Suscripción en prueba'
  if (status === 'PAST_DUE') return 'Suscripción con pago vencido'
  if (status === 'CANCELED') return 'Suscripción cancelada'
  if (status === 'INACTIVE') return 'Suscripción inactiva'
  return 'Estado no disponible'
}

export function grantsPlan(status: string): boolean {
  return status === 'ACTIVE' || status === 'TRIALING' || status === 'PAST_DUE'
}

export interface PlanHeadline {
  title: string
  status: string
  identity: string | null
  limitsReady: boolean
}

export function planHeadline(usage: ClubUsage | null, subscription: ClubSubscription | null): PlanHeadline | null {
  if (usage) {
    const identity = usage.subscriptionPlanCode && usage.subscriptionPlanCode !== usage.planCode
      ? `Plan registrado: ${usage.subscriptionPlanCode}`
      : null
    return { title: usage.planCode, status: statusLabel(usage.status), identity, limitsReady: true }
  }
  if (!subscription) return null
  return {
    title: subscription.planCode,
    status: statusLabel(subscription.status),
    identity: grantsPlan(subscription.status) ? null : `Plan registrado: ${subscription.planCode}`,
    limitsReady: false,
  }
}

export interface PlanBanner {
  tone: 'info' | 'warning' | 'neutral' | 'error' | 'success'
  title: string
  body: string
}

export function usageBanners(usage: ClubUsage | null): PlanBanner[] {
  if (!usage) return []
  const meters = [usage.club.activeTournaments, usage.club.staffUsers]
  if (usage.event) meters.push(usage.event.confirmedEntries, usage.event.divisions)
  const visible = meters.filter(item => item.state === 'LIMITED')
  if (visible.some(item => item.exceeded)) {
    return [{
      tone: 'warning',
      title: 'Tu uso supera el plan vigente',
      body: 'El cambio de plan conserva torneos, staff, parejas y divisiones. Se bloquean nuevas operaciones que excedan el límite.',
    }]
  }
  if (visible.some(item => item.reached)) {
    return [{
      tone: 'neutral',
      title: `Alcanzaste los límites de ${usage.planCode}`,
      body: 'Los datos existentes siguen disponibles. Mejorá el plan para ampliar estos límites.',
    }]
  }
  const warnings = visible.filter(item => item.warning)
  if (warnings.length === 1 && warnings[0].key === 'confirmedEntries' && warnings[0].limit != null) {
    const percent = meterPercent(warnings[0])
    return [{
      tone: 'warning',
      title: 'Te acercás al límite de parejas',
      body: `${warnings[0].used} de ${warnings[0].limit} parejas confirmadas en este torneo${percent == null ? '' : ` (${percent}%)`}. Todavía podés confirmar parejas.`,
    }]
  }
  if (warnings.length > 0) {
    return [{
      tone: 'warning',
      title: warnings.length === 1 ? `Te acercás al límite de ${meterLabel(warnings[0].key).toLowerCase()}` : 'Te acercás a un límite del plan',
      body: 'Todavía podés operar dentro del límite vigente.',
    }]
  }
  return []
}

export function pendingBanner(subscription: ClubSubscription | null, effectivePlan: string | null): PlanBanner | null {
  const requested = subscription?.requestedPlan
  if (!requested) return null
  const current = effectivePlan ?? subscription?.planCode ?? 'el plan vigente'
  const lines = [`${current} sigue activo con sus límites hasta que se confirme el cobro. Podés continuar usando tu plan actual.`]
  if (requested.chargeOutcome === 'FAILED') lines.push('El último cobro de esta solicitud no se confirmó.')
  if (requested.chargeOutcome === 'CANCELED') lines.push('El último cobro de esta solicitud fue cancelado.')
  if (requested.chargeOutcome === 'CONFIRMED') lines.push('Hay un cobro confirmado. El plan vigente es el que muestra esta pantalla.')
  return { tone: 'info', title: `${requested.planCode} pendiente de pago`, body: lines.join(' ') }
}

export function chargeBanner(charge: BillingCharge | null): PlanBanner | null {
  if (!charge) return null
  if (charge.confirmed || charge.status === 'APPLIED') {
    return { tone: 'success', title: 'Pago confirmado', body: 'Actualizamos la consulta del plan. No se abrió otro cobro.' }
  }
  if (charge.manualResolution || charge.status === 'UNAPPLIED') {
    return { tone: 'warning', title: 'Pendiente de resolución manual', body: 'El cobro no se aplicó al plan. No es un pago confirmado.' }
  }
  if (charge.status === 'FAILED') return { tone: 'error', title: 'El cobro no se confirmó', body: 'Podés volver a consultar o iniciar el pago otra vez.' }
  if (charge.status === 'CANCELED') return { tone: 'error', title: 'El cobro fue cancelado', body: 'Cerrar el navegador no produce este estado. Podés iniciar el pago otra vez.' }
  return { tone: 'info', title: 'Todavía sin confirmación', body: 'Podés volver a consultar el estado. La consulta no inicia otro pago.' }
}

export function capabilityLines(plan: PlanOffer | null): string[] {
  if (!plan) return []
  const lines: string[] = []
  for (const feature of plan.features) {
    if (feature.state === 'ABSENT') continue
    if (feature.key === 'CUSTOM_BRANDING' && feature.state === 'ENABLED') lines.push('Marca personalizada')
    if (feature.key === 'ADVANCED_STATS' && feature.state === 'ENABLED') lines.push('Estadísticas avanzadas')
    if (feature.key === 'ADVANCED_STATS' && feature.state === 'DISABLED') lines.push('Estadísticas avanzadas · Post-MVP')
    if (feature.key === 'PRIORITY_SUPPORT' && feature.state === 'ENABLED') lines.push('Soporte prioritario')
    if (feature.key === 'PRIORITY_SUPPORT' && feature.state === 'DISABLED') lines.push('Soporte estándar')
  }
  return lines
}

export function upgradeChoices(subscription: ClubSubscription, catalog: PlanOffer[]): UpgradeChoice[] {
  const choices: UpgradeChoice[] = []
  if (subscription.actions.requestAdjustmentQuote) {
    choices.push({ kind: 'adjustment', planCode: 'ELITE', name: 'ELITE' })
  }
  if (subscription.actions.fullCheckout) {
    for (const offer of catalog) {
      if (offer.code !== 'PRO' && offer.code !== 'ELITE') continue
      if (offer.free || offer.price?.status !== 'AVAILABLE') continue
      if (subscription.actions.requestAdjustmentQuote && offer.code === 'ELITE') continue
      const paidOpen = subscription.commercialPeriod?.kind === 'PAID' && subscription.commercialPeriod.open && subscription.commercialPeriod.planCode === offer.code
      if (paidOpen) continue
      choices.push({
        kind: 'checkout',
        planCode: offer.code,
        name: offer.name,
        amount: offer.price?.amount ?? null,
        currency: offer.price?.currency ?? null,
      })
    }
  }
  return choices
}

export function primaryAction(subscription: ClubSubscription | null, canManage: boolean): 'complete' | 'upgrade' | 'browse' | null {
  if (!canManage || !subscription) return null
  if (subscription.requestedPlan) return 'complete'
  const hasCheckout = subscription.actions.fullCheckout || subscription.actions.requestAdjustmentQuote
  return hasCheckout ? 'upgrade' : 'browse'
}

export function completeUsesAdjustment(subscription: ClubSubscription | null): boolean {
  return Boolean(subscription?.requestedPlan?.planCode === 'ELITE' && subscription.actions.requestAdjustmentQuote)
}

export function formatBusinessDate(value: string | null): string | null {
  const match = DATE.exec(value ?? '')
  if (!match) return null
  return `${Number(match[3])}/${Number(match[2])}/${match[1]}`
}

export function formatPayUntil(value: string | null): string | null {
  if (!value || Number.isNaN(Date.parse(value))) return null
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export interface BillingAttempt {
  userId: string
  clubId: string
  reference: string
}

export function billingAttempt(userId: string, clubId: string, reference: string): BillingAttempt | null {
  if (!text(userId) || !text(clubId) || !isChargeReference(reference)) return null
  return { userId, clubId, reference }
}

export function readBillingAttempt(value: unknown, userId: string, clubId: string): string | null {
  const source = record(value)
  if (!source || source.userId !== userId || source.clubId !== clubId) return null
  return isChargeReference(text(source.reference) ?? undefined) ? text(source.reference) : null
}

export function resumeAlreadyActive(status: number): boolean {
  return status === 409
}
