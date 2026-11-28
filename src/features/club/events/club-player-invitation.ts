import { useState } from 'react'
import { apiClient, ApiError } from '@/lib/api-client'
import type { EntryScope, PairPlayer } from './club-pair-registration'
import { useCatalog } from './use-divisions'

export type InvitationDraft = { firstName: string; lastName: string; email: string; gender: string; categoryId: string }
type Outcome = 'CREATED' | 'EXISTING_PLAYER' | 'ACCOUNT_WITHOUT_PLAYER' | 'BLOCKED' | 'INELIGIBLE'
type Result = { outcome: Outcome; player: PairPlayer | null; reason: string | null }
const empty: InvitationDraft = { firstName: '', lastName: '', email: '', gender: '', categoryId: '' }

export const invitationLabels = {
  firstName: 'Nombre', lastName: 'Apellido', email: 'Email', gender: 'Sexo / rama', categoryId: 'Categoría base inicial',
}
export const invitationGenders = [{ value: 'MALE', label: 'Caballeros' }, { value: 'FEMALE', label: 'Damas' }]

export function ineligibilityDetail(reason: string | null) {
  switch (reason) {
    case 'PLAYER_ALREADY_SELECTED': return 'El jugador ya ocupa el otro puesto de la pareja.'
    case 'PLAYER_ALREADY_REGISTERED': return 'El jugador ya tiene una inscripción activa en el torneo.'
    case 'GENDER_MISMATCH': return 'El jugador no cumple con la rama de esta división.'
    default: return 'El jugador no cumple con las reglas de categoría de esta división.'
  }
}

export function useClubPlayerInvitation(scope: EntryScope, teammateId: string | undefined,
  pending: { current: boolean }, done: (player: PairPlayer, created: boolean) => void) {
  const catalog = useCatalog()
  const [draft, setDraft] = useState(empty)
  const [errors, setErrors] = useState<Partial<InvitationDraft>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  function setField(key: keyof InvitationDraft, value: string) {
    if (pending.current) return
    setDraft(previous => ({ ...previous, [key]: value }))
    setErrors(previous => ({ ...previous, [key]: undefined }))
    setResult(null)
    setError('')
  }

  async function submit() {
    if (pending.current || !catalog.data) return
    const input = { ...draft, firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), email: draft.email.trim() }
    const invalid: Partial<InvitationDraft> = {}
    for (const key of Object.keys(invitationLabels) as (keyof InvitationDraft)[]) {
      if (!input[key]) invalid[key] = 'Campo obligatorio.'
    }
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) invalid.email = 'Ingresá un email válido.'
    setErrors(invalid)
    if (Object.keys(invalid).length) return

    pending.current = true
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const path = '/clubs/' + encodeURIComponent(scope.clubId) + '/events/' + encodeURIComponent(scope.eventId) +
        '/divisions/' + encodeURIComponent(scope.divisionId) + '/player-invitations'
      const answer = await apiClient.post<Result>(path, { ...input, teammateId }, { timeoutMs: 15000 })
      if (answer.outcome === 'CREATED' && answer.player) done(answer.player, true)
      else if ((answer.outcome === 'EXISTING_PLAYER' && answer.player) ||
          answer.outcome === 'ACCOUNT_WITHOUT_PLAYER' || answer.outcome === 'BLOCKED' || answer.outcome === 'INELIGIBLE') setResult(answer)
      else setError('No pudimos verificar el alta. Intentá nuevamente.')
    } catch (failure) {
      setError(failure instanceof ApiError && failure.status === 409
        ? 'La inscripción ya no está abierta en esta división.'
        : 'No pudimos crear el jugador. Intentá nuevamente.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  function selectExisting() {
    if (!pending.current && result?.outcome === 'EXISTING_PLAYER' && result.player) done(result.player, false)
  }

  return { catalog, draft, errors, busy, error, result, setField, submit, selectExisting, edit: () => setResult(null) }
}
