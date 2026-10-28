import type { EventsApi } from './events.api'
import { toRegistrationPlayer } from './events.api'
import {
  MOCK_CURRENT_ENROLLMENT_PLAYER,
  searchEnrollmentPlayers,
} from './players.mock'
import { compactQualifierZones } from './qualifier.mock'
import { compactBracketRounds } from './bracket.mock'
import { COPA_NECOCHEA_CATEGORIES, OPEN_OTONO_CATEGORIES } from './mock-data'
import type { EnrollablePlayer, Event, Location, Registration, RegistrationStatus } from '../types'

const locations: Location[] = [
  { id: 'buenos-aires', name: 'Buenos Aires' },
  { id: 'mar-del-plata', name: 'Mar del Plata' },
  { id: 'necochea', name: 'Necochea' },
]

const events: Event[] = [
  {
    id: 'open-otono',
    title: 'Open de Otono',
    club: 'Padel Norte Club',
    locationId: 'buenos-aires',
    locationName: 'Buenos Aires, Buenos Aires',
    status: 'INSCRIPTION_OPEN',
    dateLabel: '15 - 22 Mayo 2026',
    priceLabel: '$25.000 por pareja',
    categories: OPEN_OTONO_CATEGORIES,
  },
  {
    id: 'copa-necochea',
    title: 'Copa Necochea 2026',
    club: 'Club Necochea Padel',
    locationId: 'necochea',
    locationName: 'Necochea, Buenos Aires',
    status: 'INSCRIPTION_OPEN',
    dateLabel: '25 - 28 Marzo 2026',
    priceLabel: '$40.000',
    categories: COPA_NECOCHEA_CATEGORIES,
  },
  {
    id: 'torneo-metropolitano',
    title: 'Torneo Metropolitano',
    club: 'Club Palermo Padel',
    locationId: 'buenos-aires',
    locationName: 'Buenos Aires, Buenos Aires',
    status: 'IN_PROGRESS',
    dateLabel: '10 - 17 Mayo 2026',
    priceLabel: '$30.000 por pareja',
    categories: [
      {
        id: '4ta',
        name: '4ta Caballeros',
        playerCount: 16,
        canEnroll: false,
        registrations: [
          {
            id: 'r4',
            players: [
              { name: 'Diego Morales', location: 'Buenos Aires' },
              { name: 'Facundo Ríos', location: 'Buenos Aires' },
            ],
            status: 'CONFIRMED',
          },
          {
            id: 'r5',
            players: [
              { name: 'Pablo Vega', location: 'Buenos Aires' },
              { name: 'Martín Costa', location: 'Buenos Aires' },
            ],
            status: 'CONFIRMED',
          },
        ],
        matches: [
          {
            id: '4ta-m1',
            court: 'Cancha 3',
            scheduledLabel: 'Dom 11 May · 09:00',
            teamA: 'Morales / Rios',
            teamB: 'Vega / Costa',
            score: '7-5 · 6-3',
          },
        ],
        qualifierZones: compactQualifierZones('4ta', [
          ['Diego Morales', 'Facundo Ríos'],
          ['Pablo Vega', 'Martín Costa'],
        ]),
        bracketRounds: compactBracketRounds('4ta', [
          ['Diego Morales', 'Facundo Ríos'],
          ['Pablo Vega', 'Martín Costa'],
        ]),
      },
    ],
  },
  {
    id: 'copa-costa',
    title: 'Copa Costa',
    club: 'Arena Padel',
    locationId: 'mar-del-plata',
    locationName: 'Mar del Plata, Buenos Aires',
    status: 'IN_PROGRESS',
    dateLabel: '01 - 09 Junio 2026',
    priceLabel: '$28.000 por pareja',
    categories: [
      {
        id: '6ta',
        name: '6ta Caballeros',
        playerCount: 12,
        canEnroll: false,
        registrations: [
          {
            id: 'r3',
            players: [
              { name: 'Tomás Ruiz', location: 'Mar del Plata' },
              { name: 'Luca Díaz', location: 'Mar del Plata' },
            ],
            status: 'CONFIRMED',
          },
        ],
        matches: [
          {
            id: '6ta-m1',
            court: 'Cancha 1',
            scheduledLabel: 'Vie 6 Jun · 18:00',
            teamA: 'Ruiz / Diaz',
            teamB: 'Lopez / Gomez',
          },
        ],
        qualifierZones: compactQualifierZones('6ta', [['Tomás Ruiz', 'Luca Díaz']]),
        bracketRounds: compactBracketRounds('6ta', [
          ['Tomás Ruiz', 'Luca Díaz'],
          ['Lopez', 'Gomez'],
        ]),
      },
    ],
  },
]

function randomId() {
  return Math.random().toString(36).slice(2, 8)
}

export const eventsMockService: EventsApi = {
  listLocations(): Promise<Location[]> {
    return Promise.resolve(locations)
  },
  listEventsByLocation(locationId: string): Promise<Event[]> {
    return Promise.resolve(events.filter((event) => event.locationId === locationId))
  },
  getEvent(eventId: string): Promise<Event | undefined> {
    return Promise.resolve(events.find((event) => event.id === eventId))
  },
  getCategory(eventId: string, categoryId: string) {
    const event = events.find((item) => item.id === eventId)
    return Promise.resolve(event?.categories.find((category) => category.id === categoryId))
  },
  getCurrentEnrollmentPlayer() {
    return Promise.resolve(MOCK_CURRENT_ENROLLMENT_PLAYER)
  },
  searchEnrollmentPlayers(query: string, options?: { excludeIds?: string[] }) {
    return Promise.resolve(searchEnrollmentPlayers(query, options))
  },
  async enroll(
    eventId: string,
    categoryId: string,
    player1: EnrollablePlayer,
    player2: EnrollablePlayer,
  ): Promise<Registration> {
    const event = events.find((item) => item.id === eventId)
    const category = event?.categories.find((item) => item.id === categoryId)
    const status: RegistrationStatus = category && category.registrations.length < 8 ? 'CONFIRMED' : 'WAITLIST'
    const registration: Registration = {
      id: randomId(),
      players: [toRegistrationPlayer(player1), toRegistrationPlayer(player2)],
      status,
      isOwn: true,
    }
    category?.registrations.push(registration)
    return registration
  },
  async updateRegistration(
    eventId: string,
    categoryId: string,
    registrationId: string,
    player1: EnrollablePlayer,
    player2: EnrollablePlayer,
  ): Promise<Registration> {
    const category = events
      .find((item) => item.id === eventId)
      ?.categories.find((item) => item.id === categoryId)
    const registration = category?.registrations.find((item) => item.id === registrationId)
    if (!registration) throw new Error('Inscripción no encontrada')
    registration.players = [toRegistrationPlayer(player1), toRegistrationPlayer(player2)]
    return registration
  },
}
