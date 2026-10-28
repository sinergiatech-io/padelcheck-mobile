export type EventStatus =
  | 'DRAFT'
  | 'INSCRIPTION_OPEN'
  | 'INSCRIPTION_CLOSED'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'CANCELLED'

export type RegistrationStatus = 'CONFIRMED' | 'WAITLIST' | 'CANCELLED'

export type CategoryTab = 'partidos' | 'inscripciones' | 'clasificatoria' | 'cuadros'

export type Location = {
  id: string
  name: string
}

export type RegistrationPlayer = {
  id?: string
  name: string
  location: string
}

export type EnrollablePlayer = {
  id: string
  name: string
  location: string
}

export type Registration = {
  id: string
  players: [RegistrationPlayer, RegistrationPlayer]
  status: RegistrationStatus
  /** Muestra acciones Editar / Eliminar (inscripción del usuario). */
  isOwn?: boolean
}

export type QualifierStandingRow = {
  id: string
  player1: string
  player2: string
  pj: number
  pg: number
  pp: number
  sg: number
  sp: number
  gg: number
  gp: number
}

export type QualifierMatch = {
  id: string
  teamA: [string, string]
  teamB: [string, string]
  score: string
  winnerSide: 'A' | 'B'
  dateLabel: string
  timeLabel: string
  venueLabel: string
}

export type QualifierZone = {
  id: string
  name: string
  standings: QualifierStandingRow[]
  matches: QualifierMatch[]
}

/** @deprecated Use QualifierStandingRow inside QualifierZone */
export type QualifierRow = {
  pair: string
  points: number
  played: number
}

export type BracketTeamRow = {
  player1: string
  player2: string
  sets: [number, number, number]
}

export type BracketKnockoutMatch = {
  id: string
  teamA: BracketTeamRow
  teamB: BracketTeamRow
  winnerSide: 'A' | 'B'
  dateLabel: string
  timeLabel: string
  venueLabel: string
}

export type BracketConnectorVariant = 'double' | 'semi'

export type BracketMatchPair = {
  id: string
  matches: BracketKnockoutMatch[]
  connector?: BracketConnectorVariant
}

export type BracketRound = {
  id: string
  name: string
  /** Fondo crema (#FAFAEB) en cuartos/final; blanco en semifinal. */
  variant: 'primary' | 'neutral'
  pairs: BracketMatchPair[]
}

export type CategoryMatch = {
  id: string
  court: string
  scheduledLabel: string
  teamA: string
  teamB: string
  score?: string
}

export type EventCategory = {
  id: string
  name: string
  playerCount: number
  canEnroll: boolean
  registrations: Registration[]
  qualifierZones: QualifierZone[]
  bracketRounds: BracketRound[]
  matches: CategoryMatch[]
}

export type Event = {
  id: string
  title: string
  club: string
  locationId: string
  locationName: string
  status: EventStatus
  dateLabel: string
  priceLabel: string
  categories: EventCategory[]
}
