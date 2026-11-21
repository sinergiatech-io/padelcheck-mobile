import { useLocalSearchParams } from 'expo-router'
import { HistoryScreen } from '@/features/player-profile/ProfileScreen'

export default function ProfileHistory() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>()
  return <HistoryScreen key={playerId} playerId={playerId} />
}
