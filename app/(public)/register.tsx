import { router } from 'expo-router'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ROUTES } from '@/lib/constants'

export default function RegisterScreen() {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 16,
          paddingVertical: 48,
        }}
      >
        <Card className="w-full max-w-md self-center shadow-card">
          <CardHeader>
            <CardTitle>Crear cuenta</CardTitle>
            <CardDescription>
              Registrá tu club y empezá a gestionar torneos en minutos.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            <View className="gap-2">
              <Label>Nombre del club</Label>
              <Input placeholder="Club Ejemplo" />
            </View>
            <View className="gap-2">
              <Label>Nombre del administrador</Label>
              <Input placeholder="Juan Pérez" />
            </View>
            <View className="gap-2">
              <Label>Email</Label>
              <Input keyboardType="email-address" autoCapitalize="none" placeholder="admin@club.com" />
            </View>
            <View className="gap-2">
              <Label>Contraseña</Label>
              <Input secureTextEntry />
            </View>
            <View className="gap-2">
              <Label>Teléfono (opcional)</Label>
              <Input keyboardType="phone-pad" placeholder="+54 11 1234-5678" />
            </View>
            <Button className="w-full" onPress={() => {}}>
              Crear cuenta
            </Button>
          </CardContent>
          <CardFooter className="justify-center border-t border-divider pt-6">
            <Text className="font-sans text-body-sm text-dark-700">
              ¿Ya tenés cuenta?{' '}
              <Text
                className="font-inter-600 text-body-sm text-dark-900 underline"
                onPress={() => router.push(ROUTES.login)}
              >
                Iniciar sesión
              </Text>
            </Text>
          </CardFooter>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
