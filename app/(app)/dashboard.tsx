import { router } from 'expo-router'
import { Text, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { displayName } from '@/types/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ROUTES } from '@/lib/constants'

export default function DashboardScreen() {
  const { user, logout } = useAuth()

  return (
    <View className="flex-1 gap-4 bg-background p-6">
      <View className="flex flex-row flex-wrap items-center gap-3">
        <Text className="font-inter-600 text-h2 text-dark-900">Dashboard</Text>
        <Badge variant="neutral">En construcción</Badge>
      </View>
      <Text className="font-sans text-body-sm text-dark-700">
        Bienvenido, {displayName(user) || user?.email}. Esta sección está en construcción.
      </Text>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-h4">Placeholder</CardTitle>
          <CardDescription>Contenido de Dashboard — placeholder para desarrollo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Text className="text-center font-sans text-body-sm text-dark-700">
            Próximamente: listados y formularios con el UI Kit.
          </Text>
        </CardContent>
      </Card>
      <Button
        variant="secondary"
        className="self-start"
        onPress={async () => {
          await logout()
          router.replace(ROUTES.login)
        }}
      >
        Cerrar sesión
      </Button>
    </View>
  )
}
