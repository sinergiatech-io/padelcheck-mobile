import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { ROUTES } from '@/lib/constants'

export default function SettingsScreen() {
  const { logout } = useAuth()

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 gap-4 bg-background p-6">
        <Text className="font-inter-600 text-h2 text-dark-900">Perfil</Text>
        <Text className="font-sans text-body-sm text-dark-700">Perfil y configuración del jugador.</Text>
        <Button
          variant="secondary"
          className="self-start"
          onPress={async () => {
            await logout()
            router.replace(ROUTES.login)
          }}
        >
          <Text>Cerrar sesión</Text>
        </Button>
      </View>
    </SafeAreaView>
  )
}
