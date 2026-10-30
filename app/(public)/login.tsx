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
  eyeOnXml,
  eyeXml,
  googleLabelXml,
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
    <View accessibilityRole="alert" className={`mt-[16px] flex-row items-center gap-[12px] rounded-[8px] border p-[12px] ${bannerBox[tone]}`}>
      <View className="h-[24px] w-[24px]">
        <View className="absolute left-[2px] top-[2px]">
          <SvgXml xml={bannerIcon[tone]} width={20} height={20} />
        </View>
      </View>
      <View className="min-w-0 flex-1 gap-[2px]">
        <Text className="font-inter-600 text-[14px] leading-[20px] text-[#120F18]">{title}</Text>
        {detail ? <Text className="font-sans text-[12px] leading-[16px] text-[#605E64]">{detail}</Text> : null}
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
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="h-[148px] items-center justify-center overflow-hidden" style={{ marginTop: insets.top }}>
          <SvgXml xml={courtXml} width="100%" height={172} />
          <Image
            source={logo}
            accessibilityLabel="Padel Check"
            resizeMode="contain"
            style={{ position: 'absolute', top: 28.652, left: '50%', marginLeft: -46, width: 92, height: 90.695 }}
          />
        </View>
        <View
          className="flex-1 rounded-t-[24px] bg-[#FEFEFE] px-[16px] pt-[24px]"
          style={{ paddingBottom: Math.max(58, insets.bottom) }}
        >
          <Text className="font-inter-600 text-[24px] leading-[32px] text-[#120F18]">Iniciar sesión</Text>
          {formError ? <LoginBanner {...formError} /> : null}
          <Text className="mb-[8px] mt-[16px] font-inter-500 text-[14px] leading-[20px] text-[#120F18]">Email</Text>
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
            className={`h-[56px] rounded-[8px] border bg-[#FEFEFE] px-[16px] font-inter-500 text-[14px] leading-[20px] text-[#120F18] ${
              emailError ? 'border-[#EF4444]' : 'border-[#929195]'
            }`}
          />
          {emailError ? (
            <Text className="text-right font-inter-500 text-[14px] leading-[20px] text-[#AA3030]">{emailError}</Text>
          ) : null}
          <Text className="mb-[8px] mt-[16px] font-inter-500 text-[14px] leading-[20px] text-[#120F18]">Contraseña</Text>
          <View
            className={`h-[56px] flex-row items-center rounded-[8px] border bg-[#FEFEFE] px-[16px] ${
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
              className="h-[56px] flex-1 bg-[#FEFEFE] font-inter-500 text-[14px] leading-[20px] text-[#120F18]"
            />
            <Pressable
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onPress={() => setShowPassword((value) => !value)}
            >
              <SvgXml xml={showPassword ? eyeOnXml : eyeXml} width={24} height={24} />
            </Pressable>
          </View>
          {passwordError ? (
            <Text className="text-right font-inter-500 text-[14px] leading-[20px] text-[#AA3030]">{passwordError}</Text>
          ) : null}
          <View
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel="¿Olvidaste tu contraseña?"
            className="mt-[16px] h-[44px] items-center justify-center"
          >
            <Text className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">¿Olvidaste tu contraseña?</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: submitting, disabled: paleSubmit }}
            disabled={paleSubmit}
            onPress={() => {
              void form.handleSubmit(onSubmit)()
            }}
            className={`mt-[16px] h-[48px] items-center justify-center rounded-[8px] ${
              paleSubmit ? 'bg-[#EEF0C1]' : 'bg-[#C9CF38]'
            }`}
          >
            <Text className={`font-inter-500 text-[14px] leading-[21px] ${paleSubmit ? 'text-[#605E64]' : 'text-[#120F18]'}`}>
              {submitting ? 'Ingresando…' : 'Iniciar sesión'}
            </Text>
          </Pressable>
          <View accessibilityElementsHidden className="mt-[16px] h-[24px] flex-row items-center gap-[12px]">
            <View className="h-px flex-1 bg-[#E7E7E8]" />
            <Text className="font-sans text-[16px] leading-[24px] text-[#605E64]">o</Text>
            <View className="h-px flex-1 bg-[#E7E7E8]" />
          </View>
          <View
            accessibilityRole="button"
            accessibilityLabel="Continuar con Google"
            className={`mt-[16px] h-[48px] flex-row items-center justify-center rounded-[8px] border border-[#747775] bg-white ${
              Platform.OS === 'ios' ? 'gap-[12px] px-[16px]' : 'gap-[10px] px-[12px]'
            }`}
          >
            <Image source={googleMark} style={{ width: 20, height: 20 }} resizeMode="contain" accessible={false} />
            <SvgXml xml={googleLabelXml} width={142.674} height={13.496} />
          </View>
          <Text className="mt-[16px] font-sans text-[16px] leading-[24px] text-[#605E64]">¿No tenés cuenta? Registrate como</Text>
          <View className="mt-[16px] flex-row gap-[12px]">
            <View
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel="Jugador"
              className="h-[48px] flex-1 flex-row items-center justify-center gap-[8px] rounded-[8px] border border-[#929195] pl-[8px] pr-[16px]"
            >
              <SvgXml xml={personXml} width={20} height={20} />
              <Text className="font-inter-500 text-[14px] leading-[21px] text-[#120F18]">Jugador</Text>
            </View>
            <View
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel="Club"
              className="h-[48px] flex-1 flex-row items-center justify-center gap-[8px] rounded-[8px] border border-[#929195] pl-[8px] pr-[16px]"
            >
              <SvgXml xml={clubXml} width={20} height={20.5} />
              <Text className="font-inter-500 text-[14px] leading-[21px] text-[#120F18]">Club</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
