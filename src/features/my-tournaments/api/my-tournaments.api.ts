import type { MyTournament } from '../types'

export interface MyTournamentsApi {
  listActive(): Promise<MyTournament[]>
  listHistory(): Promise<MyTournament[]>
}
