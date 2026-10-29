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
import { AUTH_COPY, loginErrorMessage, type LoginNotice } from '@/features/auth/auth-copy'
import {
  alertBlockedXml,
  alertErrorXml,
  alertWarningXml,
  clubXml,
  courtXml,
  eyeXml,
  personXml,
} from '@/features/auth/auth-icons'
import { SessionUnverified } from '@/features/auth/SessionUnverified'

const logo = require('../../assets/auth/logo.png')
const googleMark = require('../../assets/auth/google-g.png')

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const bannerIcon = {
  error: alertErrorXml,
  warning: alertWarningXml,
  neutral: alertBlockedXml,
} as const

const bannerBox = {
  error: 'border-[#FAC5C5] bg-[#FDECEC]',
  warning: 'border-[#FCE1B3] bg-[#FEF5E7]',
  neutral: 'border-[#E7E7E8] bg-[#F8F8F8]',
} as const

function LoginBanner({ tone, title, detail }: LoginNotice) {
  return (
    <View accessibilityRole="alert" className={`mt-4 flex-row items-center gap-3 rounded-lg border p-3 ${bannerBox[tone]}`}>
      <View className="h-6 w-6">
        <View className="absolute left-0.5 top-0.5">
          <SvgXml xml={bannerIcon[tone]} width={20} height={20} />
        </View>
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-inter-600 text-sm leading-5 text-[#120F18]">{title}</Text>
        {detail ? <Text className="font-sans text-xs leading-4 text-[#605E64]">{detail}</Text> : null}
      </View>
    </View>
  )
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { login, phase, destination } = useAuth()
  const params = useLocalSearchParams<{ returnUrl?: string; notice?: string }>()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<LoginNotice | null>(() =>
    consumeLoginNotice() === 'expired' || params.notice === 'expired'
      ? { tone: 'warning', title: AUTH_COPY.expired }
      : null,
  )
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const releaseBlocked = () => {
    setFormError((current) => (current?.code === 'AUTH_ACCOUNT_BLOCKED' ? null : current))
  }

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

  const paleSubmit = submitting || formError?.code === 'AUTH_ACCOUNT_BLOCKED'
  const emailError = form.formState.errors.email?.message
  const passwordError = form.formState.errors.password?.message

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
          {formError ? <LoginBanner {...formError} /> : null}
          <Text className="mb-2 mt-4 font-inter-500 text-sm text-[#120F18]">Email</Text>
          <TextInput
            value={form.watch('email')}
            onChangeText={(value) => {
              releaseBlocked()
              form.setValue('email', value, { shouldValidate: form.formState.isSubmitted })
            }}
            onBlur={() => form.trigger('email')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="nombre@correo.com"
            placeholderTextColor="#605E64"
            className={`h-14 rounded-lg border px-4 font-inter-500 text-sm text-[#120F18] ${
              emailError ? 'border-[#EF4444]' : 'border-[#929195]'
            }`}
          />
          {emailError ? (
            <Text className="mt-2 text-right font-inter-500 text-sm leading-5 text-[#AA3030]">{emailError}</Text>
          ) : null}
          <Text className="mb-2 mt-4 font-inter-500 text-sm text-[#120F18]">Contraseña</Text>
          <View
            className={`h-14 flex-row items-center rounded-lg border px-4 ${
              passwordError ? 'border-[#EF4444]' : 'border-[#929195]'
            }`}
          >
            <TextInput
              value={form.watch('password')}
              onChangeText={(value) => {
                releaseBlocked()
                form.setValue('password', value, { shouldValidate: form.formState.isSubmitted })
              }}
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
          {passwordError ? (
            <Text className="mt-2 text-right font-inter-500 text-sm leading-5 text-[#AA3030]">{passwordError}</Text>
          ) : null}
          <View
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel="¿Olvidaste tu contraseña?"
            accessibilityHint={AUTH_COPY.registerLater}
            className="mt-4 h-11 items-center justify-center"
          >
            <Text className="font-inter-500 text-sm leading-5 text-[#605E64]">¿Olvidaste tu contraseña?</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: submitting, disabled: paleSubmit }}
            disabled={paleSubmit}
            onPress={() => {
              void form.handleSubmit(onSubmit)()
            }}
            className={`mt-4 h-12 items-center justify-center rounded-lg ${
              paleSubmit ? 'bg-[#EEF0C1]' : 'bg-[#C9CF38]'
            }`}
          >
            <Text className={`font-inter-500 text-sm ${paleSubmit ? 'text-[#605E64]' : 'text-[#120F18]'}`}>
              {submitting ? 'Ingresando…' : 'Iniciar sesión'}
            </Text>
          </Pressable>
          <View accessibilityElementsHidden className="mt-4 h-6 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-[#E7E7E8]" />
            <Text className="font-sans text-base leading-6 text-[#605E64]">o</Text>
            <View className="h-px flex-1 bg-[#E7E7E8]" />
          </View>
          <View
            accessibilityRole="button"
            accessibilityLabel="Continuar con Google"
            className={`mt-4 flex-row items-center justify-center border border-[#747775] bg-white ${
              Platform.OS === 'ios' ? 'h-11 gap-3 rounded px-4' : 'h-10 gap-2.5 rounded px-3'
            }`}
          >
            <Image source={googleMark} style={{ width: 20, height: 20 }} resizeMode="contain" accessible={false} />
            <Text
              className="text-sm font-medium leading-5 text-[#1F1F1F]"
              style={{ fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'Inter_500Medium' }}
            >
              Continuar con Google
            </Text>
          </View>
          <Text className="mt-4 font-sans text-base leading-6 text-[#605E64]">¿No tenés cuenta? Registrate como</Text>
          <View className="mt-4 flex-row gap-3">
            <View
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel="Jugador"
              accessibilityHint={AUTH_COPY.registerLater}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-[#929195]"
            >
              <SvgXml xml={personXml} width={20} height={20} />
              <Text className="font-inter-500 text-sm text-[#120F18]">Jugador</Text>
            </View>
            <View
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel="Club"
              accessibilityHint={AUTH_COPY.registerLater}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-[#929195]"
            >
              <SvgXml xml={clubXml} width={20} height={20.5} />
              <Text className="font-inter-500 text-sm text-[#120F18]">Club</Text>
            </View>
          </View>
          <Text className="mt-4 font-sans text-sm text-[#605E64]">{AUTH_COPY.registerLater}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
