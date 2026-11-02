import '../global.css'
import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/context/AuthContext'
import { API_BASE } from '@/lib/constants'
import { queryClient } from '@/lib/query-client'
import { StartupProvider } from '@/features/startup/StartupProvider'
import { FONT_TIMEOUT_MS } from '@/features/startup/startup-state'

export default function RootLayout() {
  useEffect(() => {
    if (__DEV__) {
      console.log('[padelcheck] API_BASE:', API_BASE)
    }
  }, [])

  const [loaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  const [fontFallback, setFontFallback] = useState(false)
  useEffect(() => {
    if (loaded || fontError) return
    const timer = setTimeout(() => setFontFallback(true), FONT_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [loaded, fontError])

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StartupProvider fontsReady={loaded || Boolean(fontError) || fontFallback} fontsLoaded={loaded && !fontFallback}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#120F18' } }} />
          </StartupProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
