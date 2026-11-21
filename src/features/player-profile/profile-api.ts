import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { ApiError, apiClient } from '@/lib/api-client'
import type { ResolvedLocation } from '@/features/auth/registration-location'

export type Result = 'CHAMPION' | 'FINALIST' | 'SEMIFINAL' | 'QUARTERFINAL' | 'UNAVAILABLE'
export type Participation = {
  eventId: string
  divisionId: string
  tournamentName: string
  clubName: string
  endDate: string
  categoryName: string
  result: Result
}
type MatchStats = { matchesPlayed: number; matchesWon: number }
export type SportingProfile = {
  playerId: string
  firstName: string
  lastName: string
  city: string | null
  baseCategoryName: string | null
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  profilePhotoUrl: string | null
  clubCategories: { clubId: string; clubName: string; categoryName: string | null; observed?: boolean }[]
  recentTournaments: Participation[]
  stats: MatchStats
}
export type OwnProfile = SportingProfile & {
  email: string
  phone: string | null
  country: string | null
  hasLocalPassword: boolean
  location: ResolvedLocation | null
}
type HistoryPage = { items: Participation[]; page: number; hasMore: boolean }
export type TournamentResults = {
  tournament: string
  category: string
  matches: { id: string; home: string; away: string; winner: string; sets: { home: number; away: number }[]; walkover: boolean }[]
}

export const resultLabel: Record<Result, string> = {
  CHAMPION: 'Campeón', FINALIST: 'Finalista', SEMIFINAL: 'Semifinal',
  QUARTERFINAL: 'Cuartos de final', UNAVAILABLE: 'Resultado no disponible',
}

export const profileRequest = { timeoutMs: 15000 }
export const profileKey = (account: string | undefined, target = 'me') => ['player-profile', account, target]

export function usePlayerProfile(playerId?: string) {
  const { user } = useAuth()
  const path = '/players/' + (playerId ? encodeURIComponent(playerId) : 'me')
  return useQuery({
    queryKey: profileKey(user?.userId, playerId),
    enabled: Boolean(user),
    retry: false,
    queryFn: async ({ signal }) => {
      const options = { ...profileRequest, signal }
      if (playerId) return apiClient.get<SportingProfile>(path, options)
      const [profile, recentTournaments, stats] = await Promise.all([
        apiClient.get<OwnProfile>(path, options),
        apiClient.get<Participation[]>(path + '/recent-tournaments', options),
        apiClient.get<MatchStats>(path + '/stats', options),
      ])
      return { ...profile, recentTournaments, stats }
    },
  })
}

export function useSportingHistory(playerId: string) {
  const { user } = useAuth()
  const path = '/players/' + encodeURIComponent(playerId) + '/history'
  return useInfiniteQuery({
    queryKey: [...profileKey(user?.userId, playerId), 'history'],
    initialPageParam: 0,
    retry: false,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<HistoryPage>(path + '?page=' + pageParam, { ...profileRequest, signal }),
    getNextPageParam: (last) => last.hasMore ? last.page + 1 : undefined,
  })
}

export function useTournamentResults(playerId: string, eventId: string, divisionId: string) {
  const { user } = useAuth()
  const segments = [playerId, eventId, divisionId].map(encodeURIComponent)
  const path = '/players/' + segments[0] + '/history/' + segments[1] + '/' + segments[2] + '/results'
  return useQuery({
    queryKey: [...profileKey(user?.userId, playerId), 'results', eventId, divisionId],
    retry: false,
    queryFn: ({ signal }) => apiClient.get<TournamentResults>(path, { ...profileRequest, signal }),
  })
}

export function hideProfileOn(error: unknown) {
  return error instanceof ApiError && [401, 403, 404].includes(error.status)
}
