import { useLocalSearchParams } from 'expo-router'
import { ClubOnboardingScreen } from '@/features/club-onboarding/ClubOnboardingScreen'

export default function VerifyClub() {
  const { sessionId, token } = useLocalSearchParams<{ sessionId?: string; token?: string }>()
  // A replacement email may arrive while this route is already mounted.
  return <ClubOnboardingScreen key={`${sessionId ?? ''}:${token ?? ''}`} verification />
}
