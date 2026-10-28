import type { EventCategory, Registration, RegistrationPlayer } from '../types'
import { compactQualifierZones, defaultQualifierZones } from './qualifier.mock'
import { defaultBracketRounds } from './bracket.mock'

function player(name: string, location: string, id?: string): RegistrationPlayer {
  return { id, name, location }
}

function defaultRegistrations(id: string, location: string): Registration[] {
  return [
    {
      id: `${id}-r1`,
      players: [player('Juan Pérez', location), player('Carlos López', location)],
      status: 'CONFIRMED',
    },
    {
      id: `${id}-r2`,
      players: [player('Marcos Iriarte', location), player('Leo Benítez', location)],
      status: 'CONFIRMED',
    },
    {
      id: `${id}-r3`,
      players: [player('Tomás Ruiz', location, 'p-tomas'), player('Luca Díaz', location, 'p-luca')],
      status: 'CONFIRMED',
      isOwn: true,
    },
    {
      id: `${id}-r4`,
      players: [player('Pablo Vega', location), player('Martín Costa', location)],
      status: 'CONFIRMED',
    },
    {
      id: `${id}-r5`,
      players: [player('Diego Morales', location), player('Facundo Ríos', location)],
      status: 'WAITLIST',
    },
  ]
}

function caballerosCategory(
  id: string,
  name: string,
  options: {
    canEnroll?: boolean
    playerCount?: number
    location?: string
    club?: string
    registrations?: Registration[]
  } = {},
): EventCategory {
  const playerCount = options.playerCount ?? 24
  const location = options.location ?? 'Necochea'
  const club = options.club ?? 'Club Central'
  return {
    id,
    name,
    playerCount,
    canEnroll: options.canEnroll ?? false,
    registrations: options.registrations ?? defaultRegistrations(id, location),
    matches: [
      {
        id: `${id}-m1`,
        court: 'Cancha 1',
        scheduledLabel: 'Sab 15 Mar · 10:00',
        teamA: 'Pérez / López',
        teamB: 'Ruiz / Díaz',
        score: '6-4 · 6-2',
      },
      {
        id: `${id}-m2`,
        court: 'Cancha 2',
        scheduledLabel: 'Sab 15 Mar · 11:30',
        teamA: 'Iriarte / Benítez',
        teamB: 'Vega / Costa',
      },
    ],
    qualifierZones: defaultQualifierZones(id, club),
    bracketRounds: defaultBracketRounds(id, club),
  }
}

export const COPA_NECOCHEA_CATEGORIES: EventCategory[] = [
  caballerosCategory('cab-1', 'Caballeros 1', { location: 'Necochea', club: 'Club Necochea Padel' }),
  caballerosCategory('cab-2', 'Caballeros 2', { canEnroll: true, location: 'Necochea', club: 'Club Necochea Padel' }),
  caballerosCategory('cab-3', 'Caballeros 3', { location: 'Necochea', club: 'Club Necochea Padel' }),
]

export const OPEN_OTONO_CATEGORIES: EventCategory[] = [
  caballerosCategory('cab-1', 'Caballeros 1', { canEnroll: false, location: 'Buenos Aires', club: 'Padel Norte Club' }),
  caballerosCategory('cab-2', 'Caballeros 2', { canEnroll: true, location: 'Buenos Aires', club: 'Padel Norte Club' }),
  caballerosCategory('cab-3', 'Caballeros 3', { canEnroll: false, location: 'Buenos Aires', club: 'Padel Norte Club' }),
]
