import { Redirect, Stack, usePathname } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { guardRedirect } from '@/features/auth/access-destination'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { StartupReady } from '@/features/startup/StartupReady'

export function PlayerProfileLayout() {
  const pathname = usePathname()
  const { phase, destination } = useAuth()
  if (phase === 'checking') return <View className="flex-1 items-center justify-center bg-[#120F18]">
    <ActivityIndicator size="large" color="#C9CF38" />
  </View>
  if (phase === 'unverified') return <SessionUnverified />
  if (phase !== 'ready' || !destination) return <Redirect href={{ pathname: '/login', params: { returnUrl: pathname } }} />
  const redirect = guardRedirect('native', destination, pathname)
  if (redirect) return <Redirect href={redirect} />
  return <StartupReady><Stack screenOptions={{ headerShown: false }} /></StartupReady>
}
