import { router } from 'expo-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { login as loginRequest } from '@/features/auth/api/login'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ROUTES } from '@/lib/constants'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginScreen() {
  const { login } = useAuth()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: async (data) => {
      await login(data.accessToken, data.context)
      router.replace(ROUTES.dashboard)
    },
  })

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
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresá con tu email y contraseña para acceder al sistema.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <View>
              <CardContent className="gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                          placeholder="tu@club.com"
                          value={field.value}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          secureTextEntry
                          autoComplete="password"
                          value={field.value}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {mutation.isError ? (
                  <Text className="font-inter-500 text-caption text-error">
                    {mutation.error instanceof Error
                      ? mutation.error.message
                      : 'Error al iniciar sesión'}
                  </Text>
                ) : null}
                <Button
                  className="w-full"
                  disabled={mutation.isPending}
                  loading={mutation.isPending}
                  onPress={() => {
                    void form.handleSubmit((v) => mutation.mutate(v))()
                  }}
                >
                  {mutation.isPending ? 'Ingresando...' : 'Entrar'}
                </Button>
              </CardContent>
            </View>
          </Form>
          <CardFooter className="gap-3 border-t border-divider pt-6">
            <Button variant="secondary" className="w-full" onPress={() => router.push(ROUTES.designSystem)}>
              Ver Design System
            </Button>
            <Text className="self-center font-sans text-body-sm text-dark-700">
              ¿No tenés cuenta?{' '}
              <Text
                className="font-inter-600 text-body-sm text-dark-900 underline"
                onPress={() => router.push(ROUTES.register)}
              >
                Registrarse
              </Text>
            </Text>
          </CardFooter>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
