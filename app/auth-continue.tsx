import { useEffect } from 'react'
import { BackHandler, Pressable, Text, View } from 'react-native'
import { Redirect, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { acceptedReturnPath } from '@/features/auth/access-destination'
import { AUTH_COPY, continueMessage } from '@/features/auth/auth-copy'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { ROUTES } from '@/lib/constants'

export default function AuthContinueScreen() {
  const insets = useSafeAreaInsets()
  const { phase, destination, retryValidation, logout } = useAuth()
  const reason = destination?.kind === 'continue' ? destination.reason : 'unavailable'
  const message = continueMessage(reason)

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => subscription.remove()
  }, [])

  if (phase === 'checking') {
    return <View className="flex-1 bg-[#120F18]" />
  }
  if (phase === 'unverified') return <SessionUnverified />
  if (phase !== 'ready' || !destination) return <Redirect href={ROUTES.login} />
  if (destination.kind !== 'continue') {
    return <Redirect href={acceptedReturnPath('native', destination, null)} />
  }

  return (
    <View className="flex-1 justify-center bg-[#FEFEFE] px-4" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}>
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />
      <Text className="font-inter-600 text-2xl leading-8 text-[#120F18]">{message.title}</Text>
      {message.detail ? <Text className="mt-3 font-sans text-base leading-6 text-[#605E64]">{message.detail}</Text> : null}
      <Pressable onPress={retryValidation} className="mt-8 h-12 items-center justify-center rounded-lg bg-[#C9CF38]">
        <Text className="font-inter-500 text-sm text-[#120F18]">{AUTH_COPY.retry}</Text>
      </Pressable>
      <Pressable
        onPress={() => void logout()}
        className="mt-3 h-12 items-center justify-center rounded-lg border border-[#120F18]"
      >
        <Text className="font-inter-500 text-sm text-[#120F18]">{AUTH_COPY.backToAccess}</Text>
      </Pressable>
    </View>
  )
}
