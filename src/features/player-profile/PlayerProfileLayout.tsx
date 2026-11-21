import { Redirect, Stack, usePathname } from 'expo-router'
import { useRef } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { guardRedirect } from '@/features/auth/access-destination'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { StartupReady } from '@/features/startup/StartupReady'

function CheckingSession() {
  return <View className="flex-1 items-center justify-center bg-[#120F18]">
    <ActivityIndicator accessibilityLabel="Verificando sesión" size="large" color="#C9CF38" />
  </View>
}

export function PlayerProfileLayout() {
  const pathname = usePathname()
  const { phase, destination, token } = useAuth()
  const authorizedToken = useRef<string | null>(null)
  const rechecking = phase === 'checking' && token !== null && token === authorizedToken.current
  if (phase === 'checking' && !rechecking) return <CheckingSession />
  if (phase === 'unverified') return <SessionUnverified />
  if (!rechecking) {
    if (phase !== 'ready' || !destination) return <Redirect href={{ pathname: '/login', params: { returnUrl: pathname } }} />
    const redirect = guardRedirect('native', destination, pathname)
    if (redirect) return <Redirect href={redirect} />
    authorizedToken.current = token
  }
  // A native picker backgrounds the app. Keep this session's draft mounted through validation.
  return <View className="flex-1">
    <View style={{ flex: 1, display: rechecking ? 'none' : 'flex' }}>
      <StartupReady><Stack screenOptions={{ headerShown: false }} /></StartupReady>
    </View>
    {rechecking && <CheckingSession />}
  </View>
}
