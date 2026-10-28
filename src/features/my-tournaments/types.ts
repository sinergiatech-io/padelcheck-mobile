import type { EventStatus } from '@/features/events/types'

export type MyTournamentTab = 'activos' | 'historial'

export type MyTournamentResult = 'campeon' | 'final' | 'semifinal' | 'cuartos'

/** Torneo en el que participa el jugador logueado. */
export type MyTournament = {
  id: string
  eventId: string
  categoryId: string
  title: string
  club: string
  locationName: string
  dateLabel: string
  status: EventStatus
  categoryName: string
  partnerName: string
  /** Solo en historial. */
  result?: MyTournamentResult
}
