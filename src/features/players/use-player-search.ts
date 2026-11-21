import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { ApiError, apiClient } from '@/lib/api-client'

export type GenderFilter = 'MALE' | 'FEMALE'
export type Criteria = { query: string; gender?: GenderFilter; categoryId?: string }
type Category = { id: string; code: string; name: string }
type Player = {
  playerId: string
  firstName: string
  lastName: string
  gender: GenderFilter | 'OTHER' | null
  baseCategoryName: string | null
}
type PlayerPage = { items: Player[]; page: number; totalPages: number }

const timeoutMs = 15000

export function usePlayerSearch({ query, gender, categoryId }: Criteria) {
  const { user } = useAuth()
  const text = query.trim()
  const active = text.length >= 2 || Boolean(gender) || Boolean(categoryId)
  const categories = useQuery({
    queryKey: ['global-category-catalog'],
    queryFn: ({ signal }) => apiClient.get<Category[]>('/categories', { signal, timeoutMs }),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })
  const results = useInfiniteQuery({
    queryKey: ['player-search', user?.userId, text, gender, categoryId],
    enabled: active && Boolean(user),
    initialPageParam: 0,
    retry: false,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ page: String(pageParam) })
      if (text.length >= 2) params.set('q', text)
      if (gender) params.set('gender', gender)
      if (categoryId) params.set('categoryId', categoryId)
      return apiClient.get<PlayerPage>('/players/search?' + params, { signal, timeoutMs })
    },
    getNextPageParam: page => page.page + 1 < page.totalPages ? page.page + 1 : undefined,
  })
  const restricted = results.error instanceof ApiError && [401, 403].includes(results.error.status)
  return { categories, results, active, rows: restricted ? [] : results.data?.pages.flatMap(page => page.items) ?? [] }
}

export function categoryLabel(player: Player) {
  if (!player.baseCategoryName) return 'Sin categoría'
  return [player.baseCategoryName, player.gender === 'MALE' ? 'Caballeros' : player.gender === 'FEMALE' ? 'Damas' : ''].filter(Boolean).join(' ')
}

export const genderOptions = [
  { label: 'Todos', value: undefined },
  { label: 'Caballeros', value: 'MALE' },
  { label: 'Damas', value: 'FEMALE' },
] as const
