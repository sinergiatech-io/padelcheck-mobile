import { useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useForm } from 'react-hook-form'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { z } from 'zod'
import { useAuth } from '@/context/AuthContext'
import { consumeLoginNotice } from '@/features/auth/login-notice'
import { login as loginRequest } from '@/features/auth/api/login'
import { acceptedReturnPath, resolveAccessDestination } from '@/features/auth/access-destination'
import { AUTH_COPY, loginErrorMessage } from '@/features/auth/auth-copy'
import { clubXml, courtXml, eyeXml, personXml } from '@/features/auth/auth-icons'
import { SessionUnverified } from '@/features/auth/SessionUnverified'

const logo = require('../../assets/auth/logo.png')

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { login, phase, destination } = useAuth()
  const params = useLocalSearchParams<{ returnUrl?: string; notice?: string }>()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(() =>
    consumeLoginNotice() === 'expired' || params.notice === 'expired' ? AUTH_COPY.expired : null,
  )
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setFormError(null)
    try {
      const data = await loginRequest(values)
      const accepted = await login(data.accessToken, data.context, data.expiresIn)
      if (!accepted) return
      const resolved = resolveAccessDestination(data.context.accessContexts)
      const returnUrl = typeof params.returnUrl === 'string' ? params.returnUrl : null
      router.replace(acceptedReturnPath('native', resolved, returnUrl))
    } catch (error) {
      setFormError(loginErrorMessage(error))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (phase === 'checking') {
    return (
      <View className="flex-1 items-center justify-center bg-[#120F18]">
        <ActivityIndicator size="large" color="#C9CF38" />
      </View>
    )
  }
  if (phase === 'unverified') return <SessionUnverified />
  if (phase === 'ready' && destination) {
    return <Redirect href={acceptedReturnPath('native', destination, null)} />
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-[#120F18]"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
      >
        <View className="h-[148px] items-center justify-center overflow-hidden" style={{ marginTop: insets.top }}>
          <SvgXml xml={courtXml} width="100%" height="148" />
          <Image source={logo} accessibilityLabel="Padel Check" className="absolute h-[91px] w-[92px]" resizeMode="contain" />
        </View>
        <View className="flex-1 rounded-t-3xl bg-[#FEFEFE] px-4 pt-6">
          <Text className="font-inter-600 text-2xl leading-8 text-[#120F18]">Iniciar sesión</Text>
          <Text className="mb-2 mt-4 font-inter-500 text-sm text-[#120F18]">Email</Text>
          <TextInput
            value={form.watch('email')}
            onChangeText={(value) => form.setValue('email', value, { shouldValidate: form.formState.isSubmitted })}
            onBlur={() => form.trigger('email')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="nombre@correo.com"
            placeholderTextColor="#605E64"
            className="h-14 rounded-lg border border-[#929195] px-4 font-inter-500 text-sm text-[#120F18]"
          />
          {form.formState.errors.email ? (
            <Text className="mt-1 font-inter-500 text-sm text-error">{form.formState.errors.email.message}</Text>
          ) : null}
          <Text className="mb-2 mt-4 font-inter-500 text-sm text-[#120F18]">Contraseña</Text>
          <View className="h-14 flex-row items-center rounded-lg border border-[#929195] px-4">
            <TextInput
              value={form.watch('password')}
              onChangeText={(value) => form.setValue('password', value, { shouldValidate: form.formState.isSubmitted })}
              onBlur={() => form.trigger('password')}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              placeholder="Ingresá tu contraseña"
              placeholderTextColor="#605E64"
              className="h-14 flex-1 font-inter-500 text-sm text-[#120F18]"
            />
            <Pressable
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onPress={() => setShowPassword((value) => !value)}
            >
              <SvgXml xml={eyeXml} width={24} height={24} />
            </Pressable>
          </View>
          {form.formState.errors.password ? (
            <Text className="mt-1 font-inter-500 text-sm text-error">{form.formState.errors.password.message}</Text>
          ) : null}
          {formError ? (
            <Text accessibilityRole="alert" className="mt-4 font-inter-500 text-sm text-error">
              {formError}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: submitting, disabled: submitting }}
            disabled={submitting}
            onPress={() => {
              void form.handleSubmit(onSubmit)()
            }}
            className="mt-4 h-12 items-center justify-center rounded-lg bg-[#C9CF38] disabled:opacity-60"
          >
            <Text className="font-inter-500 text-sm text-[#120F18]">
              {submitting ? 'Ingresando...' : 'Iniciar sesión'}
            </Text>
          </Pressable>
          <Text className="mt-6 font-sans text-base leading-6 text-[#605E64]">¿No tenés cuenta? Registrate como</Text>
          <View className="mt-3 flex-row gap-3">
            <View className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-[#929195] opacity-60">
              <SvgXml xml={personXml} width={20} height={20} />
              <Text className="font-inter-500 text-sm text-[#120F18]">Jugador</Text>
            </View>
            <View className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-[#929195] opacity-60">
              <SvgXml xml={clubXml} width={20} height={20} />
              <Text className="font-inter-500 text-sm text-[#120F18]">Club</Text>
            </View>
          </View>
          <Text className="mt-2 font-sans text-sm text-[#605E64]">{AUTH_COPY.registerLater}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
