import type { MyTournamentsApi } from './my-tournaments.api'
import type { MyTournament } from '../types'

/** Torneos activos de Andres Castro (jugador mock logueado). */
const activeTournaments: MyTournament[] = [
  {
    id: 'mt-active-copa-necochea',
    eventId: 'copa-necochea',
    categoryId: 'cab-1',
    title: 'Copa Necochea 2026',
    club: 'Club Necochea Padel',
    locationName: 'Necochea, Buenos Aires',
    dateLabel: '25 - 28 Marzo 2026',
    status: 'INSCRIPTION_OPEN',
    categoryName: 'Caballeros 1',
    partnerName: 'Juan Pérez',
  },
  {
    id: 'mt-active-metropolitano',
    eventId: 'torneo-metropolitano',
    categoryId: '4ta',
    title: 'Torneo Metropolitano',
    club: 'Club Palermo Padel',
    locationName: 'Buenos Aires, Buenos Aires',
    dateLabel: '10 - 17 Mayo 2026',
    status: 'IN_PROGRESS',
    categoryName: '4ta Caballeros',
    partnerName: 'Facundo Ríos',
  },
]

/** Historial de torneos finalizados. */
const historyTournaments: MyTournament[] = [
  {
    id: 'mt-hist-invierno',
    eventId: 'copa-invierno-2025',
    categoryId: 'cab-1',
    title: 'Copa Invierno 2025',
    club: 'Club Necochea Padel',
    locationName: 'Necochea, Buenos Aires',
    dateLabel: '12 - 15 Julio 2025',
    status: 'FINISHED',
    categoryName: 'Caballeros 1',
    partnerName: 'Juan Pérez',
    result: 'campeon',
  },
  {
    id: 'mt-hist-primavera',
    eventId: 'open-primavera-2025',
    categoryId: 'cab-2',
    title: 'Open Primavera 2025',
    club: 'Padel Norte Club',
    locationName: 'Buenos Aires, Buenos Aires',
    dateLabel: '3 - 6 Abril 2025',
    status: 'FINISHED',
    categoryName: 'Caballeros 2',
    partnerName: 'Carlos López',
    result: 'final',
  },
]

export const myTournamentsMockService: MyTournamentsApi = {
  listActive() {
    return Promise.resolve(activeTournaments)
  },
  listHistory() {
    return Promise.resolve(historyTournaments)
  },
}
