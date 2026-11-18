import { useEffect, useMemo, useRef, useState, type ElementRef, type ReactNode } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { AccessibilityInfo, ActivityIndicator, AppState, findNodeHandle, Keyboard, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { eyeOnXml, eyeXml } from '@/features/auth/auth-icons'
import { Banner, Shell, fieldClass, type BannerTone } from '@/features/auth/RegisterShell'
import { RegistrationLocationFields } from '@/features/auth/RegistrationLocationFields'
import { useRegistrationLocation } from '@/features/auth/use-registration-location'
import type { PositionProvider } from '@/features/auth/registration-location'
import { useClubOnboarding } from './onboarding-client'
import {
  PLAN_LINES, isPaid, planFooter, readProof, stepNumber,
  type AccountDraft, type CourtDraft, type PlanCode, type VerifyProof, type WizardView,
} from './onboarding-model'

/** The wizard never reads the administrator's position: the club is located by the catalog only. */
const manualOnly: PositionProvider = { permission: async () => 'denied', position: async () => { throw new Error('GPS is not used in club onboarding') } }

const emptyAccount: AccountDraft = { firstName: '', lastName: '', email: '', password: '', phone: '' }
let courtSequence = 0
const newCourt = (): CourtDraft => ({ key: `court-${++courtSequence}`, name: '' })

type Copy = { eyebrow?: string; title: string; subtitle: string }
function copyFor(view: WizardView, state: { email: string; payment: string | null; plan: PlanCode; completedPlan: string | null }): Copy {
  const step = stepNumber(view)
  const eyebrow = step ? `Paso ${step} de 5` : undefined
  switch (view) {
    case 'account': return { eyebrow, title: 'Tu club empieza acá', subtitle: 'Creá tu cuenta para empezar a organizar tus torneos' }
    case 'emailPending': return { eyebrow, title: 'Verificá tu email', subtitle: 'Te enviamos un enlace para confirmar tu dirección. Verificá tu email antes de continuar.' }
    case 'verifying': return { eyebrow, title: 'Verificando tu email', subtitle: 'Estamos comprobando el enlace de verificación.' }
    case 'emailVerified': return { eyebrow, title: 'Email verificado', subtitle: 'Tu cuenta está verificada y lista para avanzar.' }
    case 'linkInvalid': return { eyebrow, title: 'Necesitás un nuevo enlace', subtitle: 'Este enlace venció o ya no es válido.' }
    case 'verifyError': return { eyebrow, title: 'No pudimos verificar tu email', subtitle: 'Revisá tu conexión e intentá de nuevo.' }
    case 'sessionExpired': return { eyebrow: 'Retomá tu registro', title: 'Volvé a iniciar sesión', subtitle: 'Podés continuar con los pasos que ya guardaste.' }
    case 'club': return { eyebrow, title: 'Presentanos tu club', subtitle: 'Contanos cómo se llama y dónde está' }
    case 'plan': return { eyebrow, title: 'Elegí un plan', subtitle: 'Elegí el plan para tus torneos' }
    case 'payment': {
      const base = { eyebrow: `${eyebrow} · Pago` }
      if (state.payment === 'activated') return { ...base, title: `Plan ${state.plan} activado`, subtitle: 'El pago se confirmó. Sigamos con tu sede y canchas.' }
      if (state.payment === 'canceled') return { ...base, title: 'Pago cancelado', subtitle: 'No se realizó ningún cobro. Podés intentarlo de nuevo o seguir con FREE.' }
      if (state.payment === 'failed') return { ...base, title: 'Pago no confirmado', subtitle: 'No pudimos confirmar el pago. Podés intentarlo de nuevo o seguir con FREE.' }
      return { ...base, title: 'Pago pendiente', subtitle: 'Todavía no recibimos la confirmación del pago.' }
    }
    case 'venue': return { eyebrow, title: 'Prepará tu primera sede', subtitle: 'La ubicación se precarga desde tu club y es editable. Agregá al menos una cancha.' }
    case 'done': return { eyebrow: 'Configuración completa', title: 'Tu club ya está listo', subtitle: 'Guardaste tu primera sede y cancha. ¡A organizar tus torneos!' }
    case 'resumeError': return { title: 'No pudimos retomar tu registro', subtitle: 'Revisá tu conexión e intentá de nuevo.' }
    default: return { title: 'Cargando…', subtitle: '' }
  }
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string | null; children: ReactNode }) {
  return <View className="gap-[8px]">
    <Text className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">{label}{required ? <Text className="text-[#EF4444]">*</Text> : null}</Text>
    {children}
    {error ? <Text accessibilityRole="alert" className="text-right font-inter-500 text-[14px] leading-[20px] text-[#AA3030]">{error}</Text> : null}
  </View>
}

export function ClubOnboardingScreen({ verification = false }: { verification?: boolean }) {
  const params = useLocalSearchParams<{ sessionId?: string; email?: string; token?: string }>()
  const auth = useAuth()
  const { flow, state } = useClubOnboarding()
  const { view, busy } = state
  const [proof] = useState<VerifyProof | null>(() => verification ? readProof(params) : null)
  const hasBearer = auth.phase === 'ready' && !!auth.token && !!auth.user?.accessContexts?.some(context => context.activity === 'CLUB' && context.initialSetupStatus === 'PENDING')
  const authSettled = auth.phase !== 'checking'

  const [account, setAccount] = useState<AccountDraft>(emptyAccount)
  const [showPassword, setShowPassword] = useState(false)
  const [clubName, setClubName] = useState('')
  const [venueName, setVenueName] = useState('')
  const [courts, setCourts] = useState<CourtDraft[]>(() => [newCourt()])
  const clubGeo = useRegistrationLocation(manualOnly, view === 'club')
  const venueGeo = useRegistrationLocation(manualOnly, view === 'venue')

  const headingRef = useRef<ElementRef<typeof Text>>(null)
  const scroll = useRef<ElementRef<typeof ScrollView>>(null)
  const scrollOffset = useRef(0)
  const keyboardTop = useRef<number | null>(null)
  const inputs = useRef<Record<string, ElementRef<typeof TextInput> | null>>({})
  const focused = useRef<string | null>(null)
  const reveal = () => {
    const input = focused.current ? inputs.current[focused.current] : null
    const limit = keyboardTop.current
    if (!input || !scroll.current || limit == null) return
    input.measureInWindow((_x, y, _w, height) => {
      const overflow = y + height + 12 - limit
      if (overflow > 0) scroll.current?.scrollTo({ y: scrollOffset.current + overflow + 28, animated: true })
    })
  }
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event => { keyboardTop.current = event.endCoordinates.screenY; setTimeout(reveal, 80) })
    const hide = Keyboard.addListener('keyboardDidHide', () => { keyboardTop.current = null })
    return () => { show.remove(); hide.remove() }
  }, [])

  // Opening: verification link, or resume (bearer wins over the stored session id).
  const started = useRef(false)
  useEffect(() => {
    if (!authSettled || started.current) return
    started.current = true
    if (verification) {
      void flow.verifyLink(proof)
      router.setParams({ sessionId: undefined, email: undefined, token: undefined })
    } else void flow.open(hasBearer)
  }, [authSettled])

  useEffect(() => {
    if (view !== 'account') setAccount(current => current.password ? { ...current, password: '' } : current)
    Keyboard.dismiss()
    const handle = findNodeHandle(headingRef.current)
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle)
  }, [view])

  // Seed the saved club on entry to the club and venue steps (editable afterwards).
  useEffect(() => {
    if (view === 'club') {
      if (state.club?.name && !clubName) setClubName(state.club.name)
      if (state.club?.location) void clubGeo.model.preset(state.club.location)
    }
    if (view === 'venue') {
      const location = state.club?.location
      if (location) void venueGeo.model.preset(location)
    }
  }, [view])

  // Coming back from the payment page: re-read what the provider confirmed.
  useEffect(() => {
    if (view !== 'payment') return
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') void flow.consultPayment() })
    return () => subscription.remove()
  }, [view])

  const openLogin = (returnUrl?: string) => router.replace({ pathname: '/login', params: returnUrl ? { returnUrl } : {} })
  const dashboard = () => auth.phase === 'ready' && auth.user ? router.replace('/dashboard') : openLogin('/dashboard')
  const copy = copyFor(view, { email: state.email, payment: state.payment, plan: state.plan, completedPlan: state.completedPlan })
  const working = busy !== null

  const primary = (label: string, onPress: () => void, loadingLabel = `${label}…`) =>
    <Button accessibilityLabel={label} loading={working} loadingLabel={loadingLabel} onPress={onPress} className={`h-[48px] rounded-[8px] disabled:opacity-100 ${working ? 'bg-[#EEF0C1]' : 'bg-[#C9CF38]'}`}>
      <Text className="font-inter-500 text-[14px] leading-[21px] text-[#120F18]">{label}</Text>
    </Button>
  const ghost = (label: string, onPress: () => void) =>
    <Button variant="ghost" disabled={working} accessibilityLabel={label} onPress={onPress} className="h-[44px]"><Text className="font-inter-500 text-[14px] leading-[21px] text-[#120F18]">{label}</Text></Button>
  const notice = state.notice ? <Banner title={state.notice} detail="Tus datos se conservaron." /> : null
  const status = (title: string, detail: string, tone: BannerTone) => <Banner title={title} detail={detail} tone={tone} />
  const input = (key: string, props: TextInputProps & { error?: boolean }) => {
    const { error, ...rest } = props
    return <TextInput ref={node => { inputs.current[key] = node }} editable={!working} placeholderTextColor="#605E64" accessibilityState={{ disabled: working }}
      onFocus={() => { focused.current = key; setTimeout(reveal, 80) }} className={`${fieldClass} ${error ? 'border-[#EF4444]' : ''}`} {...rest} />
  }
  const setAccountField = (key: keyof AccountDraft, value: string) => setAccount(current => ({ ...current, [key]: value }))

  let body: ReactNode = null
  let footer: ReactNode = null
  let footerNote: string | null = null

  if (view === 'loading' || (!authSettled && !state.sessionId && view !== 'verifying')) {
    body = <View className="items-center py-[48px]"><ActivityIndicator color="#120F18" accessibilityLabel="Cargando" /></View>
  } else if (view === 'account') {
    const errors = state.accountErrors
    body = <View className="gap-[12px]">
      {notice}
      <Field label="Nombre" required error={errors.firstName}>{input('firstName', { value: account.firstName, onChangeText: value => setAccountField('firstName', value), placeholder: 'Tu nombre', autoComplete: 'given-name', maxLength: 100, error: !!errors.firstName, accessibilityLabel: 'Nombre, obligatorio' })}</Field>
      <Field label="Apellido" required error={errors.lastName}>{input('lastName', { value: account.lastName, onChangeText: value => setAccountField('lastName', value), placeholder: 'Tu apellido', autoComplete: 'family-name', maxLength: 100, error: !!errors.lastName, accessibilityLabel: 'Apellido, obligatorio' })}</Field>
      <Field label="Email" required error={errors.email}>{input('email', { value: account.email, onChangeText: value => setAccountField('email', value), placeholder: 'nombre@correo.com', autoCapitalize: 'none', autoComplete: 'email', keyboardType: 'email-address', maxLength: 255, error: !!errors.email, accessibilityLabel: 'Email, obligatorio' })}</Field>
      <Field label="Contraseña" required error={errors.password}>
        <View>
          {input('password', { value: account.password, onChangeText: value => setAccountField('password', value), placeholder: 'Creá una contraseña', secureTextEntry: !showPassword, autoCapitalize: 'none', autoComplete: 'new-password', error: !!errors.password, accessibilityLabel: 'Contraseña, obligatorio', style: { paddingRight: 56 } })}
          <Pressable disabled={working} accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setShowPassword(value => !value)} className="absolute right-[8px] top-[4px] h-[48px] w-[40px] items-center justify-center"><SvgXml xml={showPassword ? eyeOnXml : eyeXml} width={24} height={24} /></Pressable>
        </View>
      </Field>
      <Field label="Teléfono">{input('phone', { value: account.phone, onChangeText: value => setAccountField('phone', value), placeholder: '+54 11 1234-5678', keyboardType: 'phone-pad', autoComplete: 'tel', maxLength: 30, accessibilityLabel: 'Teléfono, opcional' })}</Field>
      <View className="flex-row items-center justify-center gap-[8px]"><Text className="font-inter-500 text-[14px] text-[#605E64]">¿Ya tenés cuenta?</Text>{ghost('Iniciar sesión', () => openLogin())}</View>
    </View>
    footer = primary('Crear cuenta', () => void flow.start(account))
  } else if (view === 'emailPending') {
    body = <View className="gap-[16px]">
      {notice}
      {state.resent ? status('Enlace reenviado', 'Revisá tu bandeja de entrada y la carpeta de spam.', 'success') : null}
      {state.notVerified ? status('Todavía no recibimos la verificación', 'Abrí el enlace del correo y volvé a intentar.', 'warning') : null}
      {status('Verificación pendiente', `Esperamos la confirmación de ${state.email}.`, 'info')}
    </View>
    footer = <>{primary('Ya verifiqué mi email', () => void flow.checkVerified())}{ghost('Reenviar enlace', () => void flow.resend())}</>
  } else if (view === 'verifying') {
    body = status('Verificación en curso', 'Esperá unos segundos.', 'info')
    footer = <Text accessibilityLiveRegion="polite" className="py-[13px] text-center font-sans text-[#605E64]">Verificando…</Text>
  } else if (view === 'emailVerified') {
    body = status('Verificación completada', 'Ya podés registrar los datos de tu club.', 'success')
    footer = primary('Continuar', () => verification ? router.replace('/register/club') : flow.continueFromVerified())
  } else if (view === 'linkInvalid') {
    body = <View className="gap-[16px]">{notice}{status('El enlace ya no está disponible', 'Pedí uno nuevo para verificar tu email y continuar.', 'warning')}</View>
    footer = state.sessionId
      ? primary('Enviar un nuevo enlace', () => void flow.resend())
      : primary('Volver al registro', () => verification ? router.replace('/register/club') : flow.restart())
  } else if (view === 'verifyError') {
    body = status('Verificación no completada', 'Revisá tu conexión e intentá de nuevo.', 'error')
    footer = primary('Reintentar', () => void flow.retryVerify(proof))
  } else if (view === 'resumeError') {
    body = notice ?? status('No pudimos recuperar tu registro', 'Revisá tu conexión e intentá de nuevo.', 'error')
    footer = primary('Reintentar', () => void flow.open(hasBearer))
  } else if (view === 'sessionExpired') {
    body = status('Tu sesión venció', 'Iniciá sesión y retomá desde el primer paso incompleto.', 'warning')
    footer = primary('Iniciar sesión', () => openLogin())
  } else if (view === 'club') {
    body = <View className="gap-[12px]">
      {notice}
      <Field label="Nombre del club" required error={state.clubError}>{input('clubName', { value: clubName, onChangeText: setClubName, maxLength: 120, error: !!state.clubError, accessibilityLabel: 'Nombre del club, obligatorio' })}</Field>
      <RegistrationLocationFields wizard model={clubGeo.model} state={clubGeo.state} disabled={working} legacy={state.club?.legacyText ?? null} />
    </View>
    footer = primary('Crear club', () => {
      const valid = clubGeo.model.validate()
      const selection = clubGeo.model.state.selection
      void flow.saveClub(clubName, valid ? clubGeo.model.request() : undefined, selection ? { provinceName: selection.provinceName, localityName: selection.localityName } : null)
    })
  } else if (view === 'plan') {
    body = <View className="gap-[12px]" accessibilityRole="radiogroup">
      {notice}
      {(['FREE', 'PRO', 'ELITE'] as const).map(code => {
        const selected = state.plan === code
        return <Pressable key={code} disabled={working} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: working }} accessibilityLabel={`Plan ${code}, ${PLAN_LINES[code].join(', ')}`}
          onPress={() => flow.selectPlan(code)} className={`gap-[16px] rounded-[8px] border p-[16px] ${selected ? 'border-[#C9CF38] bg-[#120F18]' : 'border-[#E7E7E8] bg-[#FEFEFE]'}`}>
          <View className="flex-row items-center justify-between"><Text className={`font-inter-600 text-[16px] leading-[24px] ${selected ? 'text-[#FEFEFE]' : 'text-[#120F18]'}`}>{code}</Text>
            <View className={`h-[24px] w-[24px] items-center justify-center rounded-full border-2 ${selected ? 'border-[#C9CF38]' : 'border-[#605E64]'}`}>{selected ? <View className="h-[12px] w-[12px] rounded-full bg-[#C9CF38]" /> : null}</View></View>
          <View className="gap-[4px]">{PLAN_LINES[code].map(line => {
            const match = /^(Hasta )?(\d+)(.*)$/.exec(line)
            return <View key={line} className="flex-row items-center gap-[8px]"><View className={`h-[4px] w-[4px] rounded-full ${selected ? 'bg-[#C9CF38]' : 'bg-[#605E64]'}`} />
              <Text className={`font-sans text-[14px] leading-[24px] ${selected ? 'text-[#FEFEFE]' : 'text-[#120F18]'}`}>{match ? <>{match[1] ?? ''}<Text className="font-inter-700">{match[2]}</Text>{match[3]}</> : line}</Text></View>
          })}</View>
        </Pressable>
      })}
    </View>
    footerNote = planFooter(state.plan)
    footer = primary('Continuar', () => void flow.continuePlan())
  } else if (view === 'payment') {
    const payment = state.payment ?? 'pending'
    body = <View className="gap-[16px]">
      {notice}
      {payment === 'activated' ? status(`${state.plan} ya está activo`, `Tu club ya cuenta con el plan ${state.plan}.`, 'success')
        : payment === 'canceled' ? status('Pago cancelado', 'FREE sigue activo. Podés reintentar el pago cuando quieras.', 'warning')
        : payment === 'failed' ? status('No se confirmó el pago', 'FREE sigue activo. Podés reintentar el pago.', 'error')
        : status('Esperando confirmación', 'FREE sigue activo. El plan elegido se activará al confirmar el pago.', 'warning')}
    </View>
    footer = payment === 'activated' ? primary('Configurar sede y canchas', () => flow.continueToVenue())
      : <>{primary('Continuar con FREE', () => flow.continueToVenue())}
        {payment === 'pending' ? ghost('Consultar estado del pago', () => void flow.consultPayment()) : null}
        {ghost(payment === 'pending' ? 'Abrir el pago de nuevo' : 'Reintentar pago', () => void flow.continuePlan())}</>
  } else if (view === 'venue') {
    const errors = state.venueErrors
    body = <View className="gap-[12px]">
      {notice}
      <Text className="font-inter-600 text-[14px] leading-[20px] text-[#120F18]">Primera sede</Text>
      <Field label="Nombre de la sede" required error={errors.name}>{input('venueName', { value: venueName, onChangeText: setVenueName, maxLength: 120, error: !!errors.name, accessibilityLabel: 'Nombre de la sede, obligatorio' })}</Field>
      <RegistrationLocationFields wizard model={venueGeo.model} state={venueGeo.state} disabled={working} />
      <View className="mt-[8px] flex-row items-center justify-between"><Text className="font-inter-600 text-[14px] leading-[20px] text-[#120F18]">Canchas</Text>
        <Button variant="ghost" disabled={working} accessibilityLabel="Agregar cancha" onPress={() => setCourts(current => [...current, newCourt()])} className="h-[44px]"><Text className="font-inter-500 text-[14px] text-[#120F18]">+ Agregar cancha</Text></Button></View>
      {errors.courts ? <Text accessibilityRole="alert" className="font-inter-500 text-[14px] leading-[20px] text-[#AA3030]">{errors.courts}</Text> : null}
      {courts.map((court, index) => <Field key={court.key} label={`Cancha ${index + 1}`} required error={errors.courtNames[court.key]}>
        <View className="flex-row items-center gap-[8px]">
          <View className="min-w-0 flex-1">{input(court.key, { value: court.name, onChangeText: value => setCourts(current => current.map(item => item.key === court.key ? { ...item, name: value } : item)), placeholder: `Cancha ${index + 1}`, maxLength: 80, error: !!errors.courtNames[court.key], accessibilityLabel: `Nombre de la cancha ${index + 1}, obligatorio` })}</View>
          {courts.length > 1 ? <Pressable disabled={working} accessibilityRole="button" accessibilityLabel={`Quitar cancha ${index + 1}`} onPress={() => setCourts(current => current.filter(item => item.key !== court.key))} className="h-[48px] w-[48px] items-center justify-center"><Text className="font-inter-600 text-[20px] text-[#605E64]">×</Text></Pressable> : null}
        </View>
      </Field>)}
    </View>
    footer = primary('Guardar sede y canchas', () => {
      const valid = venueGeo.model.validate()
      void flow.completeVenue({ name: venueName, courts }, valid ? venueGeo.model.request() : undefined)
    })
  } else if (view === 'done') {
    const plan = state.completedPlan ?? 'FREE'
    body = status(`Plan ${plan} activo`, `Tu club está operativo con ${plan}.`, 'success')
    footer = primary('Ir al dashboard', dashboard)
  }

  // Scrolls to the first invalid field once an attempt fails validation.
  const firstError = useMemo(() => Object.values(state.accountErrors)[0] ?? state.clubError ?? state.venueErrors.name ?? state.venueErrors.courts ?? Object.values(state.venueErrors.courtNames)[0] ?? null, [state.accountErrors, state.clubError, state.venueErrors])
  useEffect(() => { if (firstError) AccessibilityInfo.announceForAccessibility(firstError) }, [firstError])

  return <Shell>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={false} scrollEventThrottle={16}
      onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.y }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24, gap: 16 }}>
      <View className="gap-[8px]">
        {copy.eyebrow ? <Text className="font-inter-600 text-[14px] leading-[20px] text-[#605E64]">{copy.eyebrow}</Text> : null}
        <Text ref={headingRef} accessibilityRole="header" className="font-inter-700 text-[24px] leading-[32px] text-[#120F18]">{copy.title}</Text>
        {copy.subtitle ? <Text className="font-sans text-[16px] leading-[24px] text-[#605E64]">{copy.subtitle}</Text> : null}
      </View>
      {body}
    </ScrollView>
    {footer ? <View className="gap-[8px] border-t border-[#E7E7E8] px-[16px] pb-[24px] pt-[16px]">
      {footerNote ? <Text className="font-inter-500 text-[14px] leading-[20px] text-[#605E64]">{footerNote}</Text> : null}
      {footer}
    </View> : null}
  </Shell>
}
