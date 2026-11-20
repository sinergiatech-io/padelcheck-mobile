
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Image, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { API_BASE } from '@/lib/constants'
import { ApiError, createApiClient } from '@/lib/http-client'
import { parseCatalog, type Category } from '@/features/club/category-policy/category-policy'
import { rememberGoogleClubDraft } from '@/features/club-onboarding/google-club-draft'
import {
  addAccountActivity, confirmGoogleEmail, exchangeGoogleIdentity, resolveGoogleContinuation,
  type AccessActivity, type GoogleAuthResponse,
} from './api/google'
import { clubXml, googleLabelXml, personXml } from './auth-icons'
import { Banner, Shell } from './RegisterShell'
import { SearchPicker } from './SearchPicker'
import { currentSessionGeneration } from './session-generation'

const mark = require('../../../assets/auth/google-g.png')
const publicClient = createApiClient({ baseUrl: API_BASE, getToken: () => null })

export function GoogleEntry({ intent, returnPath, disabled = false }: {
  intent?: AccessActivity; returnPath?: string | null; disabled?: boolean
}) {
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState(false)
  const [openJourney, setOpenJourney] = useState(false)
  const credential = useRef<string | undefined>(undefined)
  const active = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  const available = !!webClientId && (Platform.OS === 'android' || Platform.OS === 'ios' && !!iosClientId)
  const open = async () => {
    if (!webClientId || active.current || !available) return
    active.current = true
    setLaunching(true)
    setError(false)
    try {
      const { GoogleOneTapSignIn, isSuccessResponse, isCancelledResponse } = await import('react-native-nitro-google-signin')
      GoogleOneTapSignIn.configure({ webClientId, iosClientId, offlineAccess: false, autoSelectOnSignIn: false })
      if (Platform.OS === 'android') await GoogleOneTapSignIn.checkPlayServices()
      const response = await GoogleOneTapSignIn.presentExplicitSignIn()
      if (!mounted.current || isCancelledResponse(response)) return
      if (!isSuccessResponse(response) || !response.data.idToken) throw new Error('Google returned no identity token')
      credential.current = response.data.idToken
      setOpenJourney(true)
    } catch {
      if (mounted.current) setError(true)
    } finally {
      active.current = false
      if (mounted.current) setLaunching(false)
    }
  }
  return <View className="gap-2">
    <Pressable accessibilityRole="button" accessibilityLabel="Continuar con Google"
      accessibilityState={{ busy: launching, disabled: disabled || launching || !available }}
      disabled={disabled || launching || !available} onPress={() => void open()}
      className={'h-12 flex-row items-center justify-center rounded-lg border border-[#747775] bg-white '
        + (Platform.OS === 'ios' ? 'gap-3 px-4' : 'gap-2.5 px-3')}>
      {launching ? <Text className="font-inter-500 text-sm">Abriendo Google…</Text> : <>
        <Image source={mark} style={{ width: 20, height: 20 }} resizeMode="contain" accessible={false} />
        <SvgXml xml={googleLabelXml} width={143} height={14} />
      </>}
    </Pressable>
    {error && <Banner title="No pudimos abrir Google" detail="Volvé a tocar el botón para reintentar." />}
    {openJourney && <Modal visible animationType="none" onRequestClose={() => setOpenJourney(false)}>
      <GoogleJourney takeCredential={() => {
        const token = credential.current
        credential.current = undefined
        return token
      }} intent={intent} returnPath={returnPath} close={() => setOpenJourney(false)} />
    </Modal>}
  </View>
}

type Action = { label: string; run: () => void }

export function GoogleJourney({ takeCredential, emailProof, intent, returnPath, close, addActivity }: {
  takeCredential?: () => string | undefined; emailProof?: string; intent?: AccessActivity; returnPath?: string | null
  close: () => void; addActivity?: AccessActivity
}) {
  const { login, entryPath } = useAuth()
  const [response, setResponse] = useState<GoogleAuthResponse>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>()
  const [category, setCategory] = useState<string>()
  const [categories, setCategories] = useState<Category[]>([])
  const [catalogError, setCatalogError] = useState(false)
  const active = useRef<AbortController | undefined>(undefined)
  const initialized = useRef(false)
  const resultGeneration = useRef<number | undefined>(undefined)
  const lastEmailProof = useRef<string | undefined>(undefined)
  const continuation = !success && response?.outcome === 'CONTINUATION' ? response.continuation : undefined
  useEffect(() => () => active.current?.abort(), [])

  const proceed = async (result: GoogleAuthResponse) => {
    if (resultGeneration.current !== currentSessionGeneration()) {
      setResponse(undefined)
      setSuccess(undefined)
      setError("Tu sesión cambió. Volvé al acceso para continuar.")
      return
    }
    if (result.outcome === 'SESSION') {
      if (await login(result.accessToken, result.context, result.expiresIn)) {
        close()
        router.replace(entryPath(result.context, result.returnPath))
      }
    } else if (result.continuation.purpose === 'COMPLETE_CLUB_ONBOARDING') {
      const { token, expiresIn, progress } = result.continuation
      if (!progress.onboardingSessionId) throw new Error('Missing club onboarding draft')
      await rememberGoogleClubDraft(progress.onboardingSessionId, token, expiresIn)
      close()
      router.replace('/register/club')
    } else {
      setResponse(result)
      setSuccess(undefined)
    }
  }

  const run = (invoke: (signal: AbortSignal) => Promise<GoogleAuthResponse>, label?: string) => {
    if (active.current) return
    const controller = new AbortController()
    const generation = currentSessionGeneration()
    active.current = controller
    setBusy(true)
    setError(undefined)
    void invoke(controller.signal).then(async value => {
      if (controller.signal.aborted || generation !== currentSessionGeneration()) return
      resultGeneration.current = generation
      const title = label ?? (value.identityChange === 'GOOGLE_LINKED' ? 'Cuenta vinculada'
        : value.identityChange === 'ACCOUNT_ACTIVATED' ? 'Cuenta activada' : undefined)
      if (title) { setSuccess(title); setResponse(value) }
      else await proceed(value)
    }).catch(reason => {
      if (controller.signal.aborted || generation !== currentSessionGeneration()) return
      const code = reason instanceof ApiError ? reason.code : undefined
      setError(code === 'AUTH_ACCOUNT_BLOCKED' ? 'Tu cuenta está bloqueada.'
        : code === 'AUTH_EMAIL_OWNERSHIP_EXPIRED' ? 'El enlace venció. Volvé al acceso para solicitar otro.'
        : code === 'AUTH_EMAIL_OWNERSHIP_USED' ? 'El enlace ya se usó. Volvé al acceso para continuar.'
        : code === 'AUTH_EMAIL_OWNERSHIP_INVALID' ? 'El enlace de verificación no es válido.'
        : code === 'AUTH_CONTINUATION_INVALID' || code === 'AUTH_GOOGLE_INVALID_TOKEN' ? 'Tu acceso venció. Volvé a iniciar sesión.'
        : 'No pudimos continuar. Intentá de nuevo.')
    }).finally(() => {
      if (active.current === controller) {
        active.current = undefined
        if (!controller.signal.aborted) setBusy(false)
      }
    })
  }
  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled || initialized.current) return
      const credential = takeCredential?.()
      if (!credential) return
      initialized.current = true
      run(signal => exchangeGoogleIdentity({ idToken: credential, intent, returnPath: returnPath ?? undefined },
        Platform.OS === 'ios' ? 'IOS' : 'ANDROID', signal))
    })
    return () => { cancelled = true }
  // Run the provider exchange once per mounted attempt.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takeCredential])

  useEffect(() => {
    if (!emailProof) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled || lastEmailProof.current === emailProof) return
      lastEmailProof.current = emailProof
      run(signal => confirmGoogleEmail(emailProof, signal), "Email confirmado")
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailProof])

  const needsCatalog = addActivity === 'PLAYER' || continuation?.purpose === 'COMPLETE_PLAYER_PROFILE' && !continuation?.progress.baseCategoryId
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  useEffect(() => {
    if (!needsCatalog) return
    const controller = new AbortController()
    void publicClient.get<unknown>('/categories', { signal: controller.signal }).then(value => {
      const items = parseCatalog(value)
      if (!items?.length) throw new Error('Unavailable categories')
      if (!controller.signal.aborted) setCategories(items)
    }).catch(() => { if (!controller.signal.aborted) setCatalogError(true) })
    return () => controller.abort()
  }, [needsCatalog, catalogAttempt])

  let title = success ?? (addActivity === 'PLAYER' ? 'Creá tu perfil de jugador' : addActivity === 'CLUB' ? 'Registrar mi club'
    : busy || takeCredential ? 'Validando tu acceso' : emailProof ? 'Verificando tu email' : 'Enlace no disponible')
  let detail: string | undefined
  let action: Action | undefined
  const resolve = (request: Parameters<typeof resolveGoogleContinuation>[1]) => {
    if (continuation) run(signal => resolveGoogleContinuation(continuation.token, request, signal))
  }
  if (addActivity === 'CLUB') action = { label: 'Registrar mi club', run: () => run(signal => addAccountActivity({ activity: 'CLUB' }, signal)) }
  if (addActivity === 'PLAYER' && gender && category) action = { label: 'Continuar', run: () =>
    run(signal => addAccountActivity({ activity: 'PLAYER', gender, baseCategoryId: category }, signal)) }
  if (success && response) action = { label: 'Continuar', run: () => {
    void proceed(response).catch(() => setError('No pudimos guardar tus datos para continuar.'))
  } }
  else if (emailProof && error && !response) action = { label: 'Reintentar', run: () =>
    run(signal => confirmGoogleEmail(emailProof, signal), 'Email confirmado') }
  if (continuation?.purpose === 'LINK_GOOGLE_ACCOUNT') {
    title = 'Tu cuenta, como siempre'
    detail = 'Google confirmó tu email. Continuá para vincular este acceso a tu cuenta de PadelCheck.'
    action = { label: 'Vincular y continuar', run: () => resolve({ action: 'LINK_GOOGLE_ACCOUNT' }) }
  } else if (continuation?.purpose === 'EMAIL_VERIFICATION_REQUIRED') {
    const sent = continuation.progress.allowedActions.includes('CONFIRM_EMAIL_OWNERSHIP')
    title = sent ? 'Revisá tu email' : 'Confirmá tu email'
    detail = sent ? 'Te enviamos un enlace de un solo uso. Abrilo para continuar.'
      : 'Para continuar con esta cuenta de Google, necesitamos verificar tu correo.'
    action = { label: sent ? 'Reenviar enlace' : 'Enviar enlace', run: () => resolve({ action: 'SEND_EMAIL_OWNERSHIP' }) }
  } else if (continuation?.purpose === 'SELECT_ACTIVITY') {
    title = 'Elegí tu perfil'
    detail = 'Seleccioná la opción que mejor te represente'
  } else if (continuation?.purpose === 'COMPLETE_PLAYER_PROFILE') {
    title = 'Completá tu perfil'
    detail = 'Completá los datos que faltan para empezar a jugar.'
    const selectedGender = continuation.progress.gender || gender
    const categoryId = continuation.progress.baseCategoryId || category
    if (selectedGender && categoryId) action = { label: 'Continuar', run: () =>
      resolve({ action: 'COMPLETE_PLAYER_PROFILE', gender: selectedGender, baseCategoryId: categoryId }) }
  }

  return <Shell identity><ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 28, paddingBottom: 24 }}>
    <Text accessibilityRole="header" className="font-inter-600 text-2xl text-[#120F18]">{title}</Text>
    {detail && <Text className="mt-4 font-sans text-base leading-6 text-[#605E64]">{detail}</Text>}
    {!!error && <View className="mt-4"><Banner title="No pudimos continuar" detail={error} /></View>}
    {continuation?.progress.emailHint && <View className="mt-5"><Banner
      title={continuation.purpose === 'LINK_GOOGLE_ACCOUNT' ? 'Mismo email acreditado' : 'Un paso para cuidar tu cuenta'}
      detail={continuation.progress.emailHint} tone="info" /></View>}
    {continuation?.purpose === 'SELECT_ACTIVITY' && <View className="mt-8 gap-4">
      {([{ key: 'PLAYER', title: 'Jugador', icon: personXml, copy: 'Participá en torneos y seguí tus resultados.' },
        { key: 'CLUB', title: 'Administrador de club', icon: clubXml, copy: 'Registrá tu club y organizá torneos.' }] as const).map(item =>
        <Pressable key={item.key} accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }}
          onPress={() => resolve({ action: 'SELECT_ACTIVITY', activity: item.key })}
          className="min-h-[120px] flex-row items-center gap-3 rounded-lg border border-[#E7E7E8] bg-white p-4">
          <View className="rounded-lg bg-[#EEF0C1] p-2"><SvgXml xml={item.icon} width={24} height={24} /></View>
          <View className="flex-1 gap-1"><Text className="font-inter-600 text-base">{item.title}</Text><Text className="font-sans text-sm text-[#605E64]">{item.copy}</Text></View>
        </Pressable>)}
    </View>}
    {(continuation?.purpose === 'COMPLETE_PLAYER_PROFILE' || addActivity === 'PLAYER') && <View className="mt-6 gap-4">
      {!continuation?.progress.gender && <SearchPicker accessibilityLabel="Sexo" title="Sexo" searchPlaceholder="Buscar" placeholder="Seleccioná tu sexo"
        value={gender} options={[{ id: 'MALE', name: 'Caballeros' }, { id: 'FEMALE', name: 'Damas' }]}
        onSelect={id => { if (id === 'MALE' || id === 'FEMALE') setGender(id) }} disabled={busy} />}
      {!continuation?.progress.baseCategoryId && <SearchPicker accessibilityLabel="Categoría" title="Categoría" searchPlaceholder="Buscar categoría" placeholder="Seleccioná tu categoría"
        value={category} options={categories} onSelect={setCategory} disabled={busy || !categories.length} />}
      {catalogError && <Pressable accessibilityRole="button" onPress={() => { setCatalogError(false); setCatalogAttempt(value => value + 1) }}>
        <Text className="py-3 underline">Reintentar la carga de categorías</Text></Pressable>}
    </View>}
    <View className="mt-auto gap-2 pt-8">
      {action && <Button loading={busy} disabled={busy} onPress={action.run} className="h-12 rounded-lg"><Text className="font-inter-500">{action.label}</Text></Button>}
      <Button variant="secondary" onPress={close} className="h-12 rounded-lg"><Text className="font-inter-500">Volver al acceso</Text></Button>
    </View>
  </ScrollView></Shell>
}
