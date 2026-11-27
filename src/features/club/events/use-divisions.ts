import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { parseCatalog } from '../category-policy/category-policy'
import { divisionApi } from './division-api'

const queryOptions = { retry: false, staleTime: 0 } as const

export const divisionsKey = (clubId: string, eventId: string) => ['club-event-divisions', clubId, eventId] as const
export const limitKey = (clubId: string, eventId: string | null) => ['club-event-division-limit', clubId, eventId ?? 'new'] as const

/** Global catalog (KAN-108). A malformed or empty catalog is an error, never an empty choice. */
export function useCatalog() {
  return useQuery({
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryKey: ['categories'],
    queryFn: async ({ signal }) => parseCatalog(await apiClient.get<unknown>('/categories', { signal, timeoutMs: 15000 })),
  })
}

export function useDivisions(clubId: string, eventId: string) {
  return useQuery({ ...queryOptions, queryKey: divisionsKey(clubId, eventId), queryFn: ({ signal }) => divisionApi.list(clubId, eventId, signal) })
}

/** MAX_DIVISIONS_PER_EVENT, readable by CLUB_ADMIN and CLUB_STAFF; `eventId` null before the event exists. */
export function useDivisionLimit(clubId: string, eventId: string | null, enabled = true) {
  return useQuery({
    ...queryOptions,
    enabled,
    queryKey: limitKey(clubId, eventId),
    queryFn: ({ signal }) => divisionApi.limit(clubId, eventId, signal),
  })
}
