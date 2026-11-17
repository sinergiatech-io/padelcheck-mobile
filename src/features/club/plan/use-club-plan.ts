import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api-client'
import { loadBillingAttempt, saveBillingAttempt } from './billing-attempt'
import { planApi, planFailure } from './plan-api'
import {
  acceptResponse,
  isChargeReference,
  nextEventSelection,
  type BillingCharge,
  type ClubEventOption,
  type ClubSubscription,
  type ClubUsage,
} from './plan-model'

export interface ClubPlanData {
  loading: boolean
  refreshing: boolean
  forbidden: boolean
  error: 'timeout' | 'network' | 'invalid' | 'not-found' | null
  usageError: 'timeout' | 'network' | 'invalid' | 'not-found' | null
  eventsError: boolean
  subscription: ClubSubscription | null
  usage: ClubUsage | null
  events: ClubEventOption[]
  eventId: string | null
  charge: BillingCharge | null
  refresh: () => Promise<void>
  reload: () => Promise<void>
  selectEvent: (eventId: string) => Promise<void>
  rememberCharge: (reference: string) => Promise<void>
  rereadCharge: () => Promise<void>
}

function usageMissing(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 'BILLING_EVENT_NOT_FOUND' || error.code === 'BILLING_EVENT_ID_INVALID')
}

export function useClubPlan(clubId: string | null, userId: string | null, listEvents: boolean, enabled: boolean): ClubPlanData {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<ClubPlanData['error']>(null)
  const [usageError, setUsageError] = useState<ClubPlanData['usageError']>(null)
  const [eventsError, setEventsError] = useState(false)
  const [subscription, setSubscription] = useState<ClubSubscription | null>(null)
  const [usage, setUsage] = useState<ClubUsage | null>(null)
  const [events, setEvents] = useState<ClubEventOption[]>([])
  const [eventId, setEventId] = useState<string | null>(null)
  const [charge, setCharge] = useState<BillingCharge | null>(null)
  const epoch = useRef(0)
  const request = useRef(0)
  const eventRef = useRef<string | null>(null)
  const eventsRef = useRef<ClubEventOption[]>([])
  const referenceRef = useRef<string | null>(null)
  const flight = useRef<Promise<void> | null>(null)
  const hasData = useRef(false)

  useEffect(() => {
    epoch.current += 1
    request.current += 1
    eventRef.current = null
    eventsRef.current = []
    referenceRef.current = null
    hasData.current = false
    setLoading(false)
    setRefreshing(false)
    setForbidden(false)
    setError(null)
    setUsageError(null)
    setEventsError(false)
    setSubscription(null)
    setUsage(null)
    setEvents([])
    setEventId(null)
    setCharge(null)
  }, [clubId, userId])

  const current = () => ({ epoch: epoch.current, request: request.current, eventId: eventRef.current })

  const read = useCallback(async (mode: 'replace' | 'keep') => {
    if (!enabled || !clubId || !userId) return
    const started = { epoch: epoch.current, request: ++request.current, eventId: eventRef.current }
    const keep = mode === 'keep' && hasData.current
    if (keep) setRefreshing(true)
    else setLoading(true)
    try {
      const stored = referenceRef.current ?? await loadBillingAttempt(userId, clubId)
      if (!acceptResponse(started, current())) return
      if (stored && isChargeReference(stored)) referenceRef.current = stored
      const eventsRequest = listEvents ? planApi.events(clubId).then(value => ({ ok: true as const, value })).catch(reason => ({ ok: false as const, reason })) : null
      const [subscriptionResult, eventsResult] = await Promise.all([
        planApi.subscription(clubId),
        eventsRequest,
      ])
      if (!acceptResponse(started, current())) return
      let nextEvents = eventsRef.current
      if (!listEvents || !eventsResult) {
        nextEvents = []
        eventsRef.current = []
        setEventsError(false)
      } else if (eventsResult.ok) {
        nextEvents = eventsResult.value
        eventsRef.current = nextEvents
        setEventsError(false)
      } else if (planFailure(eventsResult.reason) === 'forbidden' || planFailure(eventsResult.reason) === 'unauthorized') {
        nextEvents = []
        eventsRef.current = []
        setEventsError(false)
      } else {
        setEventsError(true)
      }
      const nextEvent = nextEventSelection(eventRef.current, nextEvents)
      eventRef.current = nextEvent
      setEventId(nextEvent)
      setEvents(nextEvents)
      setSubscription(subscriptionResult)
      let usageResult: ClubUsage
      try {
        usageResult = await planApi.usage(clubId, nextEvent)
      } catch (usageFailure) {
        if (!nextEvent || !usageMissing(usageFailure)) throw usageFailure
        eventRef.current = null
        setEventId(null)
        usageResult = await planApi.usage(clubId, null)
      }
      if (!acceptResponse({ ...started, eventId: eventRef.current }, current())) return
      setUsage(usageResult)
      setUsageError(null)
      setError(null)
      setForbidden(false)
      hasData.current = true
      const reference = referenceRef.current
      if (reference) {
        try {
          const followed = await planApi.charge(clubId, reference)
          if (!acceptResponse({ ...started, eventId: eventRef.current }, current())) return
          if (followed.reference === referenceRef.current) setCharge(followed)
        } catch (chargeError) {
          if (!acceptResponse({ ...started, eventId: eventRef.current }, current())) return
          if (chargeError instanceof ApiError && chargeError.code === 'BILLING_CHARGE_NOT_FOUND') {
            referenceRef.current = null
            setCharge(null)
          }
        }
      }
    } catch (failure) {
      if (started.epoch !== epoch.current || started.request !== request.current) return
      const kind = planFailure(failure)
      if (kind === 'unauthorized') return
      if (kind === 'forbidden') {
        setForbidden(true)
        setError(null)
        return
      }
      if (keep) setUsageError(kind === 'not-found' ? 'not-found' : kind === 'timeout' ? 'timeout' : kind === 'network' ? 'network' : 'invalid')
      else setError(kind === 'timeout' ? 'timeout' : kind === 'network' ? 'network' : kind === 'not-found' ? 'not-found' : 'invalid')
    } finally {
      if (acceptResponse(started, { ...current(), eventId: started.eventId })) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [clubId, enabled, listEvents, userId])

  const refresh = useCallback(() => {
    if (flight.current) return flight.current
    const run = read(hasData.current ? 'keep' : 'replace').finally(() => {
      if (flight.current === run) flight.current = null
    })
    flight.current = run
    return run
  }, [read])

  useEffect(() => {
    if (!enabled || !clubId || !userId) return
    void refresh()
  }, [clubId, enabled, refresh, userId])

  const selectEvent = useCallback(async (next: string) => {
    if (!clubId || !enabled) return
    eventRef.current = next
    setEventId(next)
    setRefreshing(false)
    setLoading(false)
    const started = { epoch: epoch.current, request: ++request.current, eventId: next }
    setUsageError(null)
    try {
      const usageResult = await planApi.usage(clubId, next)
      if (!acceptResponse(started, current())) return
      setUsage(usageResult)
      hasData.current = true
    } catch (failure) {
      if (!acceptResponse(started, current())) return
      const kind = planFailure(failure)
      if (kind === 'unauthorized' || kind === 'forbidden') return
      setUsageError(kind === 'timeout' ? 'timeout' : kind === 'network' ? 'network' : 'invalid')
    }
  }, [clubId, enabled])

  const rememberCharge = useCallback(async (reference: string) => {
    if (!clubId || !userId || !isChargeReference(reference)) return
    referenceRef.current = reference
    setRefreshing(false)
    setLoading(false)
    try { await saveBillingAttempt(userId, clubId, reference) } catch { /* live session still follows the reference */ }
    const started = { epoch: epoch.current, request: ++request.current, eventId: eventRef.current }
    try {
      const followed = await planApi.charge(clubId, reference)
      if (!acceptResponse(started, current()) || referenceRef.current !== reference) return
      setCharge(followed)
    } catch (failure) {
      if (!acceptResponse(started, current())) return
      if (failure instanceof ApiError && failure.status === 404) return
    }
  }, [clubId, userId])

  const rereadCharge = useCallback(async () => {
    if (!clubId || !referenceRef.current) return
    const reference = referenceRef.current
    const started = { epoch: epoch.current, request: ++request.current, eventId: eventRef.current }
    try {
      const followed = await planApi.charge(clubId, reference)
      if (!acceptResponse(started, current()) || referenceRef.current !== reference) return
      setCharge(followed)
    } catch {
      if (!acceptResponse(started, current())) return
    }
  }, [clubId])

  return {
    loading, refreshing, forbidden, error, usageError, eventsError, subscription, usage, events, eventId, charge,
    refresh, reload: refresh, selectEvent, rememberCharge, rereadCharge,
  }
}
