import {
  isChargeReference,
  nextEventSelection,
  resumeConfirmation,
  type BillingCharge,
  type ClubEventOption,
  type ClubSubscription,
  type ClubUsage,
} from './plan-model'

export interface PlanReadContext {
  clubId: string
  userId: string
  listEvents: boolean
  enabled: boolean
}

export interface PlanSnapshot {
  loading: boolean
  refreshing: boolean
  forbidden: boolean
  error: 'timeout' | 'network' | 'invalid' | 'not-found' | null
  usageError: 'timeout' | 'network' | 'invalid' | 'not-found' | null
  eventsError: boolean
  /** True only when the latest subscription read completed for this context. */
  fresh: boolean
  /** True while the selected event usage has not arrived. Club meters stay visible. */
  eventPending: boolean
  subscription: ClubSubscription | null
  usage: ClubUsage | null
  events: ClubEventOption[]
  eventId: string | null
  charge: BillingCharge | null
}

export interface PlanReadClient {
  loadAttempt(userId: string, clubId: string): Promise<string | null>
  subscription(clubId: string): Promise<ClubSubscription>
  events(clubId: string): Promise<ClubEventOption[]>
  usage(clubId: string, eventId: string | null): Promise<ClubUsage>
  charge(clubId: string, reference: string): Promise<BillingCharge>
  saveAttempt(userId: string, clubId: string, reference: string): Promise<void>
}

export interface PlanReads {
  reset(): void
  invalidate(): void
  snapshot(): PlanSnapshot
  subscribe(listener: (snapshot: PlanSnapshot) => void): () => void
  refresh(context: PlanReadContext): Promise<PlanSnapshot>
  selectEvent(context: PlanReadContext, eventId: string): Promise<PlanSnapshot>
  rememberCharge(context: PlanReadContext, reference: string): Promise<PlanSnapshot>
}

function blank(): PlanSnapshot {
  return {
    loading: false,
    refreshing: false,
    forbidden: false,
    error: null,
    usageError: null,
    eventsError: false,
    fresh: false,
    eventPending: false,
    subscription: null,
    usage: null,
    events: [],
    eventId: null,
    charge: null,
  }
}

function failureKind(error: unknown): 'unauthorized' | 'forbidden' | 'not-found' | 'timeout' | 'network' | 'invalid' {
  if (!error || typeof error !== 'object') return 'invalid'
  const value = error as { status?: number; kind?: string; name?: string }
  if (value.name === 'PlanContractError') return 'invalid'
  if (value.status === 401) return 'unauthorized'
  if (value.status === 403) return 'forbidden'
  if (value.status === 404) return 'not-found'
  if (value.kind === 'timeout') return 'timeout'
  if (value.kind === 'network' || value.kind === 'cancelled') return 'network'
  return 'invalid'
}

function usageMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  return error.code === 'BILLING_EVENT_NOT_FOUND' || error.code === 'BILLING_EVENT_ID_INVALID'
}

function panelError(kind: ReturnType<typeof failureKind>): PlanSnapshot['error'] {
  if (kind === 'timeout' || kind === 'network' || kind === 'not-found') return kind
  return 'invalid'
}

/** Event meters the screen may show. A pending or mismatched event is hidden, not zeroed. */
export function visibleEventUsage(snapshot: Pick<PlanSnapshot, 'eventId' | 'usage' | 'eventPending'>) {
  if (snapshot.eventPending) return null
  const event = snapshot.usage?.event ?? null
  if (!event || event.eventId !== snapshot.eventId) return null
  return event
}

/** A kept snapshot is not a fresh renewal confirmation. */
export function resumeRead(snapshot: Pick<PlanSnapshot, 'fresh' | 'error' | 'usageError' | 'forbidden' | 'subscription'>): 'resumed' | 'pending' | 'unknown' {
  if (!snapshot.fresh || snapshot.error || snapshot.usageError || snapshot.forbidden) return 'unknown'
  return resumeConfirmation(snapshot.subscription)
}

export function paymentCheckResult(snapshot: Pick<PlanSnapshot, 'fresh' | 'forbidden' | 'charge' | 'usage'>): 'activated' | 'pending' | 'plan-mismatch' | 'settled' | 'unavailable' {
  if (snapshot.forbidden) return 'settled'
  const charge = snapshot.charge
  if (!snapshot.fresh || !charge) return 'unavailable'
  if (charge.manualResolution || charge.status === 'UNAPPLIED' || charge.status === 'FAILED' || charge.status === 'CANCELED') return 'settled'
  if (!charge.confirmed && charge.status !== 'APPLIED') return 'pending'
  return charge.planCode && snapshot.usage?.planCode === charge.planCode ? 'activated' : 'plan-mismatch'
}

export function createPlanReads(client: PlanReadClient): PlanReads {
  let epoch = 0
  let request = 0
  let flight: { epoch: number; promise: Promise<PlanSnapshot> } | null = null
  let eventId: string | null = null
  let events: ClubEventOption[] = []
  let reference: string | null = null
  let hasData = false
  let snapshot = blank()
  const listeners = new Set<(value: PlanSnapshot) => void>()

  function emit() {
    listeners.forEach(listener => listener(snapshot))
  }

  function publish(next: PlanSnapshot) {
    snapshot = next
    emit()
  }

  function reset() {
    epoch += 1
    request += 1
    flight = null
    eventId = null
    events = []
    reference = null
    hasData = false
    publish(blank())
  }

  function invalidate() {
    epoch += 1
    request += 1
    flight = null
  }

  async function read(context: PlanReadContext): Promise<PlanSnapshot> {
    const startedEpoch = epoch
    const startedRequest = ++request
    const live = () => startedEpoch === epoch && startedRequest === request
    const keep = hasData
    publish({ ...snapshot, loading: !keep, refreshing: keep, error: keep ? snapshot.error : null })
    try {
      const stored = reference ?? await client.loadAttempt(context.userId, context.clubId)
      if (!live()) return snapshot
      if (stored && isChargeReference(stored)) reference = stored
      const eventsResult = context.listEvents
        ? await client.events(context.clubId).then(value => ({ ok: true as const, value })).catch(reason => ({ ok: false as const, reason }))
        : null
      const subscription = await client.subscription(context.clubId)
      if (!live()) return snapshot
      let nextEvents = events
      let eventsError = false
      if (!context.listEvents || !eventsResult) nextEvents = []
      else if (eventsResult.ok) nextEvents = eventsResult.value
      else if (failureKind(eventsResult.reason) === 'forbidden' || failureKind(eventsResult.reason) === 'unauthorized') nextEvents = []
      else {
        eventsError = true
        nextEvents = events
      }
      events = nextEvents
      const nextEvent = nextEventSelection(eventId, nextEvents)
      eventId = nextEvent
      let usage: ClubUsage
      try {
        usage = await client.usage(context.clubId, nextEvent)
      } catch (usageFailure) {
        if (!nextEvent || !usageMissing(usageFailure)) throw usageFailure
        eventId = null
        usage = await client.usage(context.clubId, null)
      }
      if (!live()) return snapshot
      hasData = true
      let charge: BillingCharge | null = null
      const followed = reference
      if (followed) {
        try {
          const loaded = await client.charge(context.clubId, followed)
          if (!live()) return snapshot
          if (reference === followed) charge = loaded
        } catch (chargeError) {
          if (!live()) return snapshot
          if (failureKind(chargeError) === 'not-found') reference = null
        }
      }
      if (!live()) return snapshot
      publish({
        loading: false,
        refreshing: false,
        forbidden: false,
        error: null,
        usageError: null,
        eventsError,
        fresh: true,
        eventPending: false,
        subscription,
        usage,
        events: nextEvents,
        eventId,
        charge,
      })
    } catch (failure) {
      if (!live()) return snapshot
      const kind = failureKind(failure)
      if (kind === 'unauthorized') {
        publish({ ...snapshot, loading: false, refreshing: false, fresh: false })
        return snapshot
      }
      if (kind === 'forbidden') {
        publish({ ...snapshot, loading: false, refreshing: false, forbidden: true, error: null, fresh: false })
        return snapshot
      }
      const problem = panelError(kind)
      publish(keep
        ? { ...snapshot, loading: false, refreshing: false, usageError: problem, fresh: false }
        : { ...snapshot, loading: false, refreshing: false, error: problem, fresh: false })
    }
    return snapshot
  }

  function refresh(context: PlanReadContext): Promise<PlanSnapshot> {
    if (!context.enabled || !context.clubId || !context.userId) return Promise.resolve(snapshot)
    if (flight && flight.epoch === epoch) return flight.promise
    const runEpoch = epoch
    const promise = read(context).finally(() => {
      if (flight?.promise === promise && flight.epoch === runEpoch && epoch === runEpoch) flight = null
    })
    flight = { epoch: runEpoch, promise }
    return promise
  }

  async function selectEvent(context: PlanReadContext, next: string): Promise<PlanSnapshot> {
    if (!context.enabled || !context.clubId) return snapshot
    eventId = next
    const clubUsage = snapshot.usage ? { ...snapshot.usage, event: null } : snapshot.usage
    publish({ ...snapshot, eventId: next, usage: clubUsage, loading: false, refreshing: false, usageError: null, eventPending: true })
    const startedEpoch = epoch
    const startedRequest = ++request
    try {
      const usage = await client.usage(context.clubId, next)
      if (startedEpoch !== epoch || startedRequest !== request || eventId !== next) return snapshot
      hasData = true
      const event = usage.event?.eventId === next ? usage.event : null
      publish({ ...snapshot, usage: { ...usage, event }, usageError: null, eventPending: false })
    } catch (failure) {
      if (startedEpoch !== epoch || startedRequest !== request || eventId !== next) return snapshot
      const kind = failureKind(failure)
      if (kind === 'unauthorized' || kind === 'forbidden') {
        publish({ ...snapshot, eventPending: false, fresh: false, forbidden: kind === 'forbidden' })
        return snapshot
      }
      publish({ ...snapshot, usage: clubUsage, usageError: panelError(kind), eventPending: false })
    }
    return snapshot
  }

  async function rememberCharge(context: PlanReadContext, nextReference: string): Promise<PlanSnapshot> {
    if (!context.enabled || !context.clubId || !context.userId || !isChargeReference(nextReference)) return snapshot
    const startedEpoch = epoch
    reference = nextReference
    publish({ ...snapshot, loading: false, refreshing: false })
    try {
      await client.saveAttempt(context.userId, context.clubId, nextReference)
    } catch {
      /* the live context still follows the reference */
    }
    if (startedEpoch !== epoch || reference !== nextReference) return snapshot
    const startedRequest = ++request
    try {
      const charge = await client.charge(context.clubId, nextReference)
      if (startedEpoch !== epoch || startedRequest !== request || reference !== nextReference) return snapshot
      publish({ ...snapshot, charge })
    } catch (failure) {
      if (startedEpoch !== epoch || startedRequest !== request) return snapshot
      if (failureKind(failure) === 'not-found') return snapshot
    }
    return snapshot
  }

  return {
    reset,
    invalidate,
    snapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    refresh,
    selectEvent,
    rememberCharge,
  }
}
