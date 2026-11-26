import { apiClient } from '@/lib/api-client'
import type { Calendar, ClubEvent, ClubEventDetail, EventDraft, Preset, VenueOption } from './event-model'

const base = (clubId: string) => '/clubs/' + encodeURIComponent(clubId) + '/events'
const eventPath = (clubId: string, eventId: string) => base(clubId) + '/' + encodeURIComponent(eventId)
const timeoutMs = 15000

export const clubEvents = {
  list: (clubId: string, signal?: AbortSignal) => apiClient.get<ClubEvent[]>(base(clubId), { signal, timeoutMs }),
  detail: (clubId: string, eventId: string, signal?: AbortSignal) =>
    apiClient.get<ClubEventDetail>(eventPath(clubId, eventId), { signal, timeoutMs }),
  infrastructure: (clubId: string, signal?: AbortSignal) =>
    apiClient.get<VenueOption[]>(base(clubId) + '/infrastructure', { signal, timeoutMs }),
  preview: (clubId: string, preset: Preset, startDate: string, endDate: string, signal?: AbortSignal) =>
    apiClient.get<Calendar>(base(clubId) + '/calendar-preview?' +
      new URLSearchParams({ preset, startDate, endDate }).toString(), { signal, timeoutMs }),
  update: (clubId: string, eventId: string, draft: EventDraft) =>
    apiClient.patch<ClubEventDetail>(eventPath(clubId, eventId), draft, { timeoutMs }),
  cancel: (clubId: string, eventId: string) =>
    apiClient.post<ClubEventDetail>(eventPath(clubId, eventId) + '/cancel', undefined, { timeoutMs }),
}
