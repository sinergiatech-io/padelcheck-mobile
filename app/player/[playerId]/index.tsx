import { useLocalSearchParams } from 'expo-router'
import { PlayerProfileScreen } from '@/features/player-profile/ProfileScreen'

export default function Profile() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>()
  return <PlayerProfileScreen key={playerId} playerId={playerId} />
}
