import { useLocalSearchParams } from 'expo-router'
import { TournamentResultsScreen } from '@/features/player-profile/ProfileScreen'

export default function Results() {
  const { playerId, eventId, divisionId } = useLocalSearchParams<{ playerId: string; eventId: string; divisionId: string }>()
  return <TournamentResultsScreen playerId={playerId} eventId={eventId} divisionId={divisionId} />
}
