import { PlayerRegisterScreen } from '@/features/auth/PlayerRegisterScreen'
import { useLocalSearchParams } from 'expo-router'

export default function VerifyPlayer() {
  const { sessionId, token } = useLocalSearchParams<{ sessionId?: string; token?: string }>()
  // A replacement email may arrive while this route is already mounted.
  return <PlayerRegisterScreen key={`${sessionId ?? ''}:${token ?? ''}`} verification />
}
