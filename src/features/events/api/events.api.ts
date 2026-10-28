import type { EnrollablePlayer, EventCategory, Registration, RegistrationPlayer } from '../types'

export interface EventsApi {
  listLocations(): Promise<import('../types').Location[]>
  listEventsByLocation(locationId: string): Promise<import('../types').Event[]>
  getEvent(eventId: string): Promise<import('../types').Event | undefined>
  getCategory(eventId: string, categoryId: string): Promise<EventCategory | undefined>
  getCurrentEnrollmentPlayer(): Promise<EnrollablePlayer>
  searchEnrollmentPlayers(
    query: string,
    options?: { excludeIds?: string[] },
  ): Promise<EnrollablePlayer[]>
  enroll(
    eventId: string,
    categoryId: string,
    player1: EnrollablePlayer,
    player2: EnrollablePlayer,
  ): Promise<Registration>
  updateRegistration(
    eventId: string,
    categoryId: string,
    registrationId: string,
    player1: EnrollablePlayer,
    player2: EnrollablePlayer,
  ): Promise<Registration>
}

export function toRegistrationPlayer(player: EnrollablePlayer): RegistrationPlayer {
  return { id: player.id, name: player.name, location: player.location }
}
