import { useEffect, useRef, useState } from 'react'
import { findEnrollmentPlayerById, findEnrollmentPlayerByName } from '@/features/events/api/players.mock'
import type { EnrollablePlayer, Registration, RegistrationPlayer } from '@/features/events/types'

export type EnrollmentFormMode = 'create' | 'edit'

function toEnrollablePlayer(player: RegistrationPlayer): EnrollablePlayer {
  return (
    findEnrollmentPlayerById(player.id) ??
    findEnrollmentPlayerByName(player.name) ?? {
      id: player.id ?? `reg-${player.name}`,
      name: player.name,
      location: player.location,
    }
  )
}

type UseEnrollmentFormOptions = {
  mode: EnrollmentFormMode
  registration?: Registration
  currentPlayer: EnrollablePlayer | null
  isOpen: boolean
}

export function useEnrollmentForm({ mode, registration, currentPlayer, isOpen }: UseEnrollmentFormOptions) {
  const [player1, setPlayer1] = useState<EnrollablePlayer | null>(null)
  const [player2, setPlayer2] = useState<EnrollablePlayer | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false
      setPlayer1(null)
      setPlayer2(null)
      return
    }

    if (mode === 'create') {
      if (currentPlayer) setPlayer1(currentPlayer)
      if (!initializedRef.current) {
        setPlayer2(null)
        initializedRef.current = true
      }
      return
    }

    if (registration && !initializedRef.current) {
      setPlayer1(toEnrollablePlayer(registration.players[0]))
      setPlayer2(toEnrollablePlayer(registration.players[1]))
      initializedRef.current = true
    }
  }, [isOpen, mode, registration, currentPlayer])

  const canConfirm = Boolean(player1 && player2 && player1.id !== player2.id)

  return {
    player1,
    player2,
    setPlayer1,
    setPlayer2,
    canConfirm,
    player1ReadOnly: mode === 'create',
  }
}
