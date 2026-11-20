
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { GoogleJourney } from '@/features/auth/GoogleJourney'
import { clearGoogleEmailLink, takeGoogleEmailLink } from '@/features/auth/google-email-link'

export default function VerifyGoogleEmailScreen() {
  const { attempt } = useLocalSearchParams<{ attempt?: string }>()
  return <VerifyAttempt key={attempt} attempt={attempt} />
}

function VerifyAttempt({ attempt }: { attempt?: string }) {
  const [proof] = useState(() => takeGoogleEmailLink(attempt))
  useEffect(() => { clearGoogleEmailLink(attempt) }, [attempt])
  return <GoogleJourney emailProof={proof} close={() => router.replace("/login")} />
}
