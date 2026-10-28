import { eventCategoryTabPath, getDefaultCategoryTab } from '@/features/events/category-routes'
import type { MyTournament } from './types'

export function myTournamentCategoryPath(tournament: MyTournament) {
  return eventCategoryTabPath(tournament.eventId, tournament.categoryId, getDefaultCategoryTab(tournament.status))
}
