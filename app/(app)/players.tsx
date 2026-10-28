import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PlayersScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 gap-4 bg-background p-6">
        <View className="flex flex-row flex-wrap items-center gap-3">
          <Text className="font-inter-600 text-h2 text-dark-900">Jugadores</Text>
          <Badge variant="neutral">En construcción</Badge>
        </View>
        <Text className="font-sans text-body-sm text-dark-700">
          Búsqueda y contacto de jugadores (jugador).
        </Text>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-h4">Placeholder</CardTitle>
            <CardDescription>Próximamente listados según diseño Figma.</CardDescription>
          </CardHeader>
          <CardContent>
            <Text className="text-center font-sans text-body-sm text-dark-700">
              Contenido pendiente de backend.
            </Text>
          </CardContent>
        </Card>
      </View>
    </SafeAreaView>
  )
}
