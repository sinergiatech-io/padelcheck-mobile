import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { ApiError, apiClient } from '@/lib/api-client'
import type { MyTournament, MyTournamentResult, MyTournamentTab } from '../types'

const labels = { CHAMPION: 'campeon', FINALIST: 'final', SEMIFINAL: 'semifinal', QUARTERFINAL: 'cuartos' } as const
type Result = keyof typeof labels | 'UNAVAILABLE'
type TournamentDto = Omit<MyTournament, 'categoryId' | 'dateLabel' | 'result'> & { divisionId: string; date: string; result: Result | null }
type Page = { items: TournamentDto[]; page: number; hasMore: boolean }
const dateLabel = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeZone: 'UTC' })

export function useMyTournamentsQuery(tab: MyTournamentTab) {
  const { user } = useAuth()
  const query = useInfiniteQuery({
    queryKey: ['my-tournaments', user?.userId, tab],
    enabled: Boolean(user),
    initialPageParam: 0,
    retry: false,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<Page>('/players/me/tournaments?history=' + (tab === 'historial') + '&page=' + pageParam, { signal, timeoutMs: 15000 }),
    getNextPageParam: page => page.hasMore ? page.page + 1 : undefined,
  })
  const restricted = query.error instanceof ApiError && [401, 403, 404].includes(query.error.status)
  const rows: MyTournament[] = restricted ? [] : query.data?.pages.flatMap(page => page.items.map(item => ({
    ...item,
    categoryId: item.divisionId,
    dateLabel: dateLabel.format(new Date(item.date + 'T00:00:00Z')),
    result: item.result && item.result in labels ? labels[item.result as keyof typeof labels] as MyTournamentResult : undefined,
  }))) ?? []
  return { ...query, rows }
}
