import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { AUTH_COPY } from '@/features/auth/auth-copy'

export function SessionUnverified() {
  const insets = useSafeAreaInsets()
  const { retryValidation, logout } = useAuth()

  return (
    <View
      className="flex-1 justify-center bg-[#FEFEFE] px-4"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
    >
      <Text className="font-inter-600 text-2xl leading-8 text-[#120F18]">{AUTH_COPY.sessionUnverified}</Text>
      <Pressable onPress={retryValidation} className="mt-8 h-12 items-center justify-center rounded-lg bg-[#C9CF38]">
        <Text className="font-inter-500 text-sm text-[#120F18]">{AUTH_COPY.retrySession}</Text>
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
