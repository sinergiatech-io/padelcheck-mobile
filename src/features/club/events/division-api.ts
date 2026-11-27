import { apiClient } from '@/lib/api-client'
import type { ClubEventDetail } from './event-model'
import type { Division, DivisionLimit, DivisionWrite } from './division-model'

const events = (clubId: string) => '/clubs/' + encodeURIComponent(clubId) + '/events'
const divisions = (clubId: string, eventId: string) => events(clubId) + '/' + encodeURIComponent(eventId) + '/divisions'
const timeoutMs = 15000

/** Wizard steps 1–3 as sent with the confirmation (the registration window is set by the service). */
export type EventDraftWrite = {
  name: string
  startDate: string
  endDate: string
  playCalendarPreset: string | null
  venueIds: string[]
  courtIds: string[]
}

export type EventDraftResponse = { event: ClubEventDetail; divisions: Division[]; replayed: boolean }

export const divisionApi = {
  list: (clubId: string, eventId: string, signal?: AbortSignal) =>
    apiClient.get<Division[]>(divisions(clubId, eventId), { signal, timeoutMs }),
  limit: (clubId: string, eventId: string | null, signal?: AbortSignal) =>
    apiClient.get<DivisionLimit>(events(clubId) + '/division-limit' +
      (eventId ? '?' + new URLSearchParams({ eventId }).toString() : ''), { signal, timeoutMs }),
  createBatch: (clubId: string, eventId: string, items: DivisionWrite[]) =>
    apiClient.post<Division[]>(divisions(clubId, eventId) + '/batch', { divisions: items }, { timeoutMs }),
  update: (clubId: string, eventId: string, divisionId: string, item: DivisionWrite) =>
    apiClient.patch<Division>(divisions(clubId, eventId) + '/' + encodeURIComponent(divisionId), item, { timeoutMs }),
  cancel: (clubId: string, eventId: string, divisionId: string) =>
    apiClient.post<Division>(divisions(clubId, eventId) + '/' + encodeURIComponent(divisionId) + '/cancel', undefined, { timeoutMs }),
  /** Idempotent wizard confirmation: the DRAFT event and all its divisions, or nothing. */
  confirm: (clubId: string, idempotencyKey: string, event: EventDraftWrite, items: DivisionWrite[]) =>
    apiClient.post<EventDraftResponse>(events(clubId) + '/drafts', { event, divisions: items },
      { timeoutMs: 30000, headers: { 'Idempotency-Key': idempotencyKey } }),
}
