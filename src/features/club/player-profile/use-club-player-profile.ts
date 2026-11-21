import { useRef, useState } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiClient } from '@/lib/api-client'

interface CategorySummary { id: string; code: string; name: string }
export interface ClubPlayerProfile {
  clubId: string
  clubName: string
  playerId: string
  firstName: string
  lastName: string
  city: string | null
  profilePhotoUrl: string | null
  gender: 'MALE' | 'FEMALE' | null
  globalCategory: CategorySummary | null
  localCategory: CategorySummary | null
  effectiveCategory: CategorySummary | null
  observed: boolean
  observationNote?: string
  canManage: boolean
  matchesPlayed: number
  matchesWon: number
  recentActivity: { eventId: string; eventName: string; divisionName: string; startDate: string }[]
}

type View = 'profile' | 'observe' | 'category' | 'confirm-category' | 'remove' | 'history'
const titles: Record<View, string> = {
  profile: 'Jugador del club', observe: 'Observar jugador', category: 'Recategorizar',
  'confirm-category': 'Confirmar categoría', remove: 'Quitar observación', history: 'Torneos en este club',
}

export const futureNotice = 'Se aplicará a futuras inscripciones en este club. Las inscripciones existentes y el historial se conservan.'

export function profileError(error: unknown) {
  if (error instanceof ApiError && error.status === 403) return 'No tenés permiso para consultar a este jugador.'
  if (error instanceof ApiError && error.status === 404) return 'El jugador ya no está vinculado a este club.'
  return 'No pudimos cargar la ficha. Reintentá para volver a consultar.'
}

export function useClubPlayerProfile(clubId: string, playerId: string, accountId: string) {
  const path = `/clubs/${encodeURIComponent(clubId)}/players/${encodeURIComponent(playerId)}`
  const options = { timeoutMs: 15000 }
  const queryClient = useQueryClient()
  const profileKey = ['club-player-profile', accountId, clubId, playerId]
  const profile = useQuery({
    queryKey: profileKey,
    queryFn: ({ signal }) => apiClient.get<ClubPlayerProfile>(path, { ...options, signal }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 0,
  })
  const [view, setView] = useState<View>('profile')
  const history = useInfiniteQuery({
    queryKey: [...profileKey, 'history'],
    initialPageParam: 0,
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<ClubPlayerProfile['recentActivity']>(`${path}/history?page=${pageParam}`, { ...options, signal }),
    getNextPageParam: (lastPage, pages) => lastPage.length === 20 ? pages.length : undefined,
    enabled: view === 'history',
    retry: false,
  })
  const [note, setNote] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error: boolean }>()
  const sending = useRef(false)
  const catalog = useQuery({
    queryKey: ['club-player-category-catalog'],
    queryFn: ({ signal }) => apiClient.get<CategorySummary[]>('/categories', { ...options, signal }),
    enabled: view === 'category' || view === 'confirm-category',
    retry: false,
  })
  const data = profile.data
  const selected = catalog.data?.find(category => category.id === categoryId)
  const validCategory = !!selected && !catalog.isError && selected.id !== data?.localCategory?.id
  const clearsObservation = !!data?.observed && validCategory && data.effectiveCategory?.id !== categoryId
  const dirty = view === 'observe' ? note !== (data?.observationNote ?? '')
    : (view === 'category' || view === 'confirm-category') && !!categoryId && categoryId !== data?.localCategory?.id

  function open(next: View) {
    if (sending.current) return
    setNotice(undefined)
    if (next === 'observe') setNote(data?.observationNote ?? '')
    if (next === 'category' && view !== 'confirm-category') setCategoryId('')
    setView(next)
  }

  async function save() {
    if (!data?.canManage || sending.current) return
    const action = view
    if (action !== 'observe' && action !== 'confirm-category' && action !== 'remove') return
    if (action === 'confirm-category' && !validCategory) return
    sending.current = true
    setSaving(true)
    setNotice(undefined)
    try {
      await queryClient.cancelQueries({ queryKey: profileKey, exact: true })
      const updated = action === 'remove'
        ? await apiClient.delete<ClubPlayerProfile>(`${path}/observation`, options)
        : action === 'observe'
          ? await apiClient.put<ClubPlayerProfile>(`${path}/observation`, { note }, options)
          : await apiClient.put<ClubPlayerProfile>(`${path}/category-override`, { categoryId }, options)
      queryClient.setQueryData(profileKey, updated)
      void queryClient.invalidateQueries({ queryKey: ['club-linked-players', accountId, clubId] })
      void queryClient.invalidateQueries({ queryKey: ['player-profile', accountId] })
      setView('profile')
      const text = action === 'remove' ? 'Observación eliminada' : action === 'observe'
        ? data.observed ? 'Nota guardada' : 'Observación guardada'
        : clearsObservation ? 'Categoría guardada y observación eliminada' : 'Categoría guardada'
      setNotice({ text, error: false })
    } catch (error) {
      setNotice({ text: error instanceof ApiError && error.status === 403
        ? 'Ya no tenés permiso para guardar cambios en este club.'
        : 'No pudimos guardar los cambios. Reintentá.', error: true })
    } finally {
      sending.current = false
      setSaving(false)
    }
  }

  const restricted = profile.error instanceof ApiError && [401, 403, 404].includes(profile.error.status)
  return { profile, data: restricted ? undefined : data, catalog, history, selected, validCategory, clearsObservation,
    note, setNote, categoryId, setCategoryId, saving, dirty, notice, view, open, save,
    title: view === 'observe' && data?.observed ? 'Editar nota interna' : titles[view] }
}

export function activityMonth(date: string) {
  return new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`))
}
