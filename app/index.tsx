import { ActivityIndicator, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { acceptedReturnPath } from '@/features/auth/access-destination'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { ROUTES } from '@/lib/constants'

export default function Index() {
  const { phase, destination } = useAuth()

  if (phase === 'checking') {
    return (
      <View className="flex-1 items-center justify-center bg-[#120F18]">
        <ActivityIndicator size="large" color="#C9CF38" />
      </View>
    )
  }

  if (phase === 'unverified') return <SessionUnverified />
  if (phase !== 'ready' || !destination) return <Redirect href={ROUTES.login} />
  return <Redirect href={acceptedReturnPath('native', destination, null)} />
}
