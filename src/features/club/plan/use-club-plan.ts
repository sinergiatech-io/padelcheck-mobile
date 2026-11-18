import { useEffect, useRef, useState } from 'react'
import { loadBillingAttempt, saveBillingAttempt } from './billing-attempt'
import { planApi } from './plan-api'
import { createPlanReads, type PlanReadContext, type PlanSnapshot } from './plan-load'

const client = {
  loadAttempt: loadBillingAttempt,
  subscription: (clubId: string) => planApi.subscription(clubId),
  events: (clubId: string) => planApi.events(clubId),
  usage: (clubId: string, eventId: string | null) => planApi.usage(clubId, eventId),
  charge: (clubId: string, reference: string) => planApi.charge(clubId, reference),
  saveAttempt: saveBillingAttempt,
}

export interface ClubPlanData extends PlanSnapshot {
  refresh: () => Promise<PlanSnapshot>
  reload: () => Promise<PlanSnapshot>
  selectEvent: (eventId: string) => Promise<PlanSnapshot>
  rememberCharge: (reference: string) => Promise<PlanSnapshot>
  rereadCharge: () => Promise<PlanSnapshot>
}

export function useClubPlan(clubId: string | null, userId: string | null, listEvents: boolean, enabled: boolean): ClubPlanData {
  const session = useRef(createPlanReads(client))
  const context = useRef<PlanReadContext>({ clubId: clubId ?? '', userId: userId ?? '', listEvents, enabled })
  context.current = { clubId: clubId ?? '', userId: userId ?? '', listEvents, enabled }
  const [snapshot, setSnapshot] = useState<PlanSnapshot>(session.current.snapshot())

  useEffect(() => session.current.subscribe(setSnapshot), [])

  useEffect(() => {
    const current = session.current
    current.reset()
    if (!enabled || !clubId || !userId) return
    void current.refresh({ clubId, userId, listEvents, enabled })
    return () => { current.invalidate() }
  }, [clubId, enabled, listEvents, userId])

  const refresh = () => session.current.refresh(context.current)
  return {
    ...snapshot,
    refresh,
    reload: refresh,
    selectEvent: (eventId: string) => session.current.selectEvent(context.current, eventId),
    rememberCharge: (reference: string) => session.current.rememberCharge(context.current, reference),
    rereadCharge: async () => refresh(),
  }
}
