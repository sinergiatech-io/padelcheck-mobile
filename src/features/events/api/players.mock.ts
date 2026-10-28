import type { EnrollablePlayer } from '../types'

/** Jugadores buscables para armar pareja en inscripción (mock). */
export const ENROLLMENT_PLAYERS: EnrollablePlayer[] = [
  { id: 'p-andres', name: 'Andres Castro', location: 'Necochea' },
  { id: 'p-carlos', name: 'Carlos Lopez', location: 'Necochea' },
  { id: 'p-juan', name: 'Juan Pérez', location: 'Necochea' },
  { id: 'p-marcos', name: 'Marcos Iriarte', location: 'Buenos Aires' },
  { id: 'p-leo', name: 'Leo Benítez', location: 'Buenos Aires' },
  { id: 'p-tomas', name: 'Tomás Ruiz', location: 'Buenos Aires' },
  { id: 'p-luca', name: 'Luca Díaz', location: 'Buenos Aires' },
  { id: 'p-pablo', name: 'Pablo Vega', location: 'Mar del Plata' },
  { id: 'p-martin', name: 'Martín Costa', location: 'Mar del Plata' },
  { id: 'p-diego', name: 'Diego Morales', location: 'Buenos Aires' },
  { id: 'p-facundo', name: 'Facundo Ríos', location: 'Buenos Aires' },
]

/** Jugador logueado por defecto en mocks (Figma: Andres Castro). */
export const MOCK_CURRENT_ENROLLMENT_PLAYER: EnrollablePlayer = ENROLLMENT_PLAYERS[0]

export function searchEnrollmentPlayers(
  query: string,
  options: { excludeIds?: string[] } = {},
): EnrollablePlayer[] {
  const exclude = new Set(options.excludeIds ?? [])
  const normalized = query.trim().toLowerCase()
  return ENROLLMENT_PLAYERS.filter((player) => {
    if (exclude.has(player.id)) return false
    if (!normalized) return true
    return (
      player.name.toLowerCase().includes(normalized) ||
      player.location.toLowerCase().includes(normalized)
    )
  })
}

export function findEnrollmentPlayerById(id: string | undefined): EnrollablePlayer | undefined {
  if (!id) return undefined
  return ENROLLMENT_PLAYERS.find((player) => player.id === id)
}

export function findEnrollmentPlayerByName(name: string): EnrollablePlayer | undefined {
  const normalized = name.trim().toLowerCase()
  return ENROLLMENT_PLAYERS.find((player) => player.name.toLowerCase() === normalized)
}
