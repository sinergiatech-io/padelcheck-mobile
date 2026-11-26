import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clubEvents } from './event-api'
import { eventDraft, filterEvents, type ClubEventDetail, type EventDraft } from './event-model'

export const listKey = (clubId: string) => ['club-events', clubId] as const
export const detailKey = (clubId: string, eventId: string) => ['club-event', clubId, eventId] as const
const queryOptions = { retry: false, staleTime: 0 } as const

export function useEventList(clubId: string) {
  return useQuery({ ...queryOptions, queryKey: listKey(clubId), queryFn: ({ signal }) => clubEvents.list(clubId, signal) })
}

export function useEventDetail(clubId: string, eventId: string) {
  return useQuery({
    ...queryOptions,
    queryKey: detailKey(clubId, eventId),
    queryFn: ({ signal }) => clubEvents.detail(clubId, eventId, signal),
  })
}

export function useEventSearch(events: Awaited<ReturnType<typeof clubEvents.list>>) {
  const [search, setSearch] = useState('')
  const [settled, setSettled] = useState('')
  useEffect(() => {
    const timeout = setTimeout(() => setSettled(search), 200)
    return () => clearTimeout(timeout)
  }, [search])
  return { search, setSearch, searching: search !== settled, events: filterEvents(events, settled) }
}

export function useEventWizard(clubId: string, event?: ClubEventDetail) {
  const [draft, setDraft] = useState<EventDraft>(() => eventDraft(event))
  const [step, setStep] = useState(1)
  const preset = draft.playCalendarPreset
  const savedCalendar = event && preset === event.playCalendarPreset &&
    draft.startDate === event.startDate && draft.endDate === event.endDate
  const preview = useQuery({
    ...queryOptions,
    queryKey: ['club-event-calendar', clubId, preset, draft.startDate, draft.endDate],
    enabled: step === 2 && preset !== null && preset !== 'CUSTOM' && !savedCalendar,
    queryFn: ({ signal }) => clubEvents.preview(clubId, preset!, draft.startDate, draft.endDate, signal),
  })
  const infrastructure = useQuery({
    ...queryOptions,
    queryKey: ['club-event-infrastructure', clubId],
    enabled: step === 3,
    queryFn: ({ signal }) => clubEvents.infrastructure(clubId, signal),
  })
  const calendar = savedCalendar ? { status: event.playCalendarStatus, days: event.playCalendarDays } : preview.data
  return { step, setStep, draft, setDraft, calendar, preview, infrastructure }
}
