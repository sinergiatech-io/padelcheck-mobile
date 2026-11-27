import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { ApiError, apiClient } from '@/lib/api-client'
import { fetchPlayerPage } from '@/features/players/use-player-search'

export type Entry = {
  id: string
  displayName: string
  status: 'CONFIRMED' | 'WAITLIST' | 'CANCELLED'
  waitlistPosition: number | null
}

export type EntryScope = { clubId: string; eventId: string; divisionId: string }
export type PairPlayer = Awaited<ReturnType<typeof fetchPlayerPage>>['items'][number]

function entriesPath({ clubId, eventId, divisionId }: EntryScope) {
  return '/clubs/' + encodeURIComponent(clubId) + '/events/' + encodeURIComponent(eventId) +
    '/divisions/' + encodeURIComponent(divisionId) + '/entries'
}

export function useDivisionEntries(scope: EntryScope) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['club-division-entries', user?.userId, scope.clubId, scope.eventId, scope.divisionId],
    queryFn: ({ signal }) => apiClient.get<Entry[]>(entriesPath(scope), { signal, timeoutMs: 15000 }),
    retry: false,
  })
}

export function usePairPlayerSearch(query: string, excludeId: string | undefined, enabled: boolean) {
  const { user } = useAuth()
  const text = query.trim()
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), 200)
    return () => clearTimeout(timer)
  }, [text])
  return useQuery({
    queryKey: ['club-pair-player-search', user?.userId, text, excludeId],
    queryFn: ({ signal }) => fetchPlayerPage({ query: text }, 0, signal, excludeId ? [excludeId] : []),
    enabled: enabled && text.length >= 2 && text === debounced,
    retry: false,
  })
}

const categoryErrors = new Set([
  'PLAYER_CATEGORY_MISSING', 'CATEGORY_JUMP_EXCEEDED', 'CATEGORY_BELOW_EFFECTIVE',
  'CATEGORY_SUM_MISMATCH', 'CATEGORY_COMBINATION_MISMATCH',
])

export function entryError(error: unknown) {
  const code = error instanceof ApiError ? error.code : undefined
  if (code && categoryErrors.has(code)) return {
    title: 'Revisá la categoría',
    detail: 'La categoría de la pareja no cumple con las reglas de esta división.',
  }
  if (code === 'GENDER_MISMATCH') return {
    title: 'Revisá la rama',
    detail: 'La pareja no cumple con la rama de esta división.',
  }
  if (code === 'PLAN_ENTRY_LIMIT_EXCEEDED') return {
    title: 'No pudimos confirmar la pareja',
    detail: 'Este torneo alcanzó el límite de parejas confirmadas permitido por el plan.',
    planLimit: true,
  }
  if (code === 'DIVISION_FULL_NO_SUBSTITUTES') return {
    title: 'La división está completa',
    detail: 'Esta división no admite suplentes.',
  }
  if (error instanceof ApiError && error.status === 409) return {
    title: 'No pudimos confirmar la pareja',
    detail: 'Revisá si la inscripción sigue abierta y si los jugadores ya participan en el torneo.',
  }
  if (error instanceof ApiError && error.status === 403) return {
    title: 'No pudimos confirmar la pareja',
    detail: 'Revisá los permisos del club y si ambos jugadores están habilitados.',
  }
  return {
    title: 'No pudimos confirmar la pareja',
    detail: 'Tus datos siguen disponibles. Reintentá para confirmar la inscripción.',
  }
}

export function useCreateClubPair(scope: EntryScope, done: (entry: Entry) => void) {
  const [players, setPlayers] = useState<[PairPlayer | null, PairPlayer | null]>([null, null])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ReturnType<typeof entryError> | null>(null)
  const submitting = useRef(false)

  function select(index: 0 | 1, player: PairPlayer | null) {
    if (submitting.current) return
    setPlayers(current => {
      if (player && player.playerId === current[index === 0 ? 1 : 0]?.playerId) return current
      return index === 0 ? [player, current[1]] : [current[0], player]
    })
    setError(null)
  }

  async function submit() {
    const [first, second] = players
    if (submitting.current || !first || !second || first.playerId === second.playerId) return
    submitting.current = true
    setBusy(true)
    setError(null)
    let entry: Entry
    try {
      entry = await apiClient.post<Entry>(entriesPath(scope), {
        player1Id: first.playerId,
        player2Id: second.playerId,
      }, { timeoutMs: 15000 })
      if (entry?.status !== 'CONFIRMED' && entry?.status !== 'WAITLIST') {
        setError({
          title: 'No pudimos verificar la inscripción',
          detail: 'Tus datos siguen disponibles. Revisá el listado antes de volver a intentar.',
        })
        return
      }
    } catch (failure) {
      setError(entryError(failure))
      return
    } finally {
      submitting.current = false
      setBusy(false)
    }
    done(entry)
  }

  return { players, select, busy, submitting, error, submit }
}
