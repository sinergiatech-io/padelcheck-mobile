import { StartupReady } from '@/features/startup/StartupReady'
import { useEffect, useState } from 'react'
import { BackHandler, Pressable, Text, View } from 'react-native'
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { acceptedReturnPath, accessChoices, destinationPath } from '@/features/auth/access-destination'
import { GoogleJourney } from '@/features/auth/GoogleJourney'
import { AUTH_COPY, continueMessage } from '@/features/auth/auth-copy'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { ROUTES } from '@/lib/constants'

export default function AuthContinueScreen() {
  const insets = useSafeAreaInsets()
  const { phase, user, destination, chooseContext, retryValidation, logout } = useAuth()
  const { account } = useLocalSearchParams<{ account?: string }>()
  const [activity, setActivity] = useState<"PLAYER" | "CLUB">()
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
  if (destination.kind !== 'continue' && account !== '1') {
    return <Redirect href={acceptedReturnPath('native', destination, null)} />
  }

  const choices = accessChoices(user?.accessContexts)
  const hasPlayer = choices.some(choice => choice.activity === "PLAYER")
  const hasClub = choices.some(choice => choice.activity === "CLUB")
  if (activity === "PLAYER" && hasClub && !hasPlayer || activity === "CLUB" && hasPlayer && !hasClub) {
    return <GoogleJourney addActivity={activity} close={() => setActivity(undefined)} />
  }
  if (reason === "multiple-activities" || account === "1") return <StartupReady>
    <View className="flex-1 bg-[#FEFEFE] px-4 pt-8" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <Text accessibilityRole="header" className="font-inter-600 text-2xl">{choices.length > 1 ? "Elegí cómo continuar" : "Tu cuenta"}</Text>
      <View className="mt-8 gap-4">{choices.map(choice => <Pressable key={choice.key} accessibilityRole="button"
        className="min-h-[80px] justify-center rounded-lg border border-[#E7E7E8] p-4" onPress={() => {
          if (chooseContext(choice.key)) router.replace(choice.destination.kind === "continue" ? "/register/club" : destinationPath("native", choice.destination))
        }}><Text className="font-inter-600">{choice.activity === "PLAYER" ? "Como jugador" : "Administrar mi club"}</Text></Pressable>)}</View>
      {account === "1" && <View className="mt-4 gap-3">
        {hasClub && !hasPlayer && <Pressable className="min-h-12 justify-center" accessibilityRole="button" onPress={() => setActivity("PLAYER")}><Text className="font-inter-500">Crear perfil de jugador</Text></Pressable>}
        {hasPlayer && !hasClub && <Pressable className="min-h-12 justify-center" accessibilityRole="button" onPress={() => setActivity("CLUB")}><Text className="font-inter-500">Registrar mi club</Text></Pressable>}
        {user?.hasLocalPassword === false && <Pressable className="min-h-12 justify-center" accessibilityRole="button" onPress={() => router.push("/forgot-password")}><Text className="font-inter-500">Crear contraseña</Text></Pressable>}
      </View>}
      <Pressable className="mt-auto min-h-12 items-center justify-center rounded-lg border" accessibilityRole="button"
        onPress={() => {
          if (account !== "1") void logout()
          else if (router.canGoBack()) router.back()
          else router.replace(destinationPath("native", destination))
        }}>
        <Text className="font-inter-500">{account === "1" ? "Cancelar" : "Volver al acceso"}</Text></Pressable>
    </View>
  </StartupReady>

  return (
    <StartupReady><View className="flex-1 justify-center bg-[#FEFEFE] px-4" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}>
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />
      <Text className="font-inter-600 text-2xl leading-8 text-[#120F18]">{message.title}</Text>
      {message.detail ? <Text className="mt-3 font-sans text-base leading-6 text-[#605E64]">{message.detail}</Text> : null}
      {reason === 'pending-setup' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/register/club')}
          className="mt-8 h-12 items-center justify-center rounded-lg bg-[#C9CF38]"
        >
          <Text className="font-inter-500 text-sm text-[#120F18]">{AUTH_COPY.continueRegistration}</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={retryValidation}
        className={`${reason === 'pending-setup' ? 'mt-3 border border-[#120F18]' : 'mt-8 bg-[#C9CF38]'} h-12 items-center justify-center rounded-lg`}
      >
        <Text className="font-inter-500 text-sm text-[#120F18]">{AUTH_COPY.retry}</Text>
      </Pressable>
      <Pressable
        onPress={() => void logout()}
        className="mt-3 h-12 items-center justify-center rounded-lg border border-[#120F18]"
      >
        <Text className="font-inter-500 text-sm text-[#120F18]">{AUTH_COPY.backToAccess}</Text>
      </Pressable>
    </View></StartupReady>
  )
}
