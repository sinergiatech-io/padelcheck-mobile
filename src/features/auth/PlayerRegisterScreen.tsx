import { useEffect, useRef, useState, type ReactNode, type ElementRef } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { AccessibilityInfo, findNodeHandle, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StartupReady } from '@/features/startup/StartupReady'
import { usePlayerRegistration, validateDraft, statusCopy, type Draft, type Proof } from './player-registration'
import { courtXml, eyeXml, eyeOnXml } from './auth-icons'
import { chevronXml, infoXml, successXml, errorXml, warningXml } from './register-icons'
import { useRegistrationLocation } from './use-registration-location'
import { nativePosition } from './native-location'
import { RegistrationLocationFields } from './RegistrationLocationFields'

const tones = { info: 'border-[#C2D8FC] bg-[#EBF3FE]', success: 'border-[#BAEDCD] bg-[#E9F9EF]', error: 'border-[#FAC5C5] bg-[#FDECEC]', warning: 'border-[#FCE1B3] bg-[#FEF5E7]' }
function Banner({ title, detail, tone = 'error' }: { title: string; detail: string; tone?: keyof typeof tones }) {
  return <View accessibilityRole="alert" className={`flex-row items-center gap-[12px] rounded-[8px] border p-[12px] ${tones[tone]}`}>
    <View className="h-[24px] w-[24px] items-center justify-center"><SvgXml xml={{ info: infoXml, success: successXml, error: errorXml, warning: warningXml }[tone]} /></View>
    <View className="min-w-0 flex-1"><Text className="font-inter-600 text-[14px] leading-[20px] text-[#120F18]">{title}</Text><Text className="mt-[2px] font-sans text-[12px] leading-[16px] text-[#605E64]">{detail}</Text></View>
  </View>
}
function Shell({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const [keyboard, setKeyboard] = useState(false)
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false))
    return () => { show.remove(); hide.remove() }
  }, [])
  return <StartupReady><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-[#120F18]" style={{ paddingTop: insets.top }}>
    <View style={{ height: keyboard ? 72 : 124, overflow: 'hidden' }}>
      <SvgXml xml={courtXml} width="100%" height={172} />
      <Image source={require('../../../assets/auth/logo.png')} accessibilityLabel="Padel Check" resizeMode="contain" style={{ position: 'absolute', top: keyboard ? 8 : 16, left: '50%', marginLeft: keyboard ? -28 : -46, width: keyboard ? 56 : 92, height: keyboard ? 55 : 91 }} />
    </View>
    <View className="min-h-0 flex-1 overflow-hidden rounded-t-[24px] bg-[#FEFEFE]" style={{ paddingBottom: keyboard ? 0 : insets.bottom }}>{children}</View>
  </KeyboardAvoidingView></StartupReady>
}
const fieldClass = 'h-[56px] rounded-[8px] border border-[#929195] bg-[#FEFEFE] px-[16px] font-inter-500 text-[14px] text-[#120F18]'
export function PlayerRegisterScreen({ verification = false }: { verification?: boolean }) {
  const params = useLocalSearchParams<{ sessionId?: string; email?: string; token?: string; returnUrl?: string }>()
  const [initialProof] = useState<Proof | undefined>(() => verification ? { sessionId: params.sessionId ?? '', email: params.email ?? '', token: params.token ?? '' } : undefined)
  const registration = usePlayerRegistration(Platform.OS === 'ios' ? 'IOS' : 'ANDROID', initialProof)
  const { draft, updateField, errors, categories, catalogState, retryCatalog, stage, proof, busy, busyAction, notice, resent, action } = registration
  const geography = useRegistrationLocation(nativePosition, stage === 'form')
  const [showPassword, setShowPassword] = useState(false)
  const scroll = useRef<ElementRef<typeof ScrollView>>(null)
  const scrollOffset = useRef(0)
  const focusedKey = useRef<keyof Draft | null>(null)
  const locationSearch = useRef<ElementRef<typeof TextInput> | null>(null)
  const keyboardTop = useRef<number | null>(null)
  const headingRef = useRef<ElementRef<typeof Text>>(null)
  const inputs = useRef<Partial<Record<keyof Draft, ElementRef<typeof TextInput>>>>({})
  const revealFocused = () => {
    const input = locationSearch.current ?? (focusedKey.current ? inputs.current[focusedKey.current] : undefined)
    const scroller = scroll.current
    const limit = keyboardTop.current
    if (!input || !scroller || limit == null) return
    input.measureInWindow((_x, y, _width, height) => {
      const overflow = y + height + 12 - limit
      if (overflow > 0) scroller.scrollTo({ y: scrollOffset.current + overflow + 28, animated: true })
    })
  }
  const login = () => router.replace({ pathname: '/login', params: params.returnUrl ? { returnUrl: params.returnUrl } : {} })
  useEffect(() => {
    if (stage !== 'form') Keyboard.dismiss()
    const handle = findNodeHandle(headingRef.current)
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle)
  }, [stage])
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY
      setTimeout(revealFocused, 80)
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => { keyboardTop.current = null })
    return () => { show.remove(); hide.remove() }
  }, [])
  const setField = updateField
  const submit = () => {
    const validLocation = geography.model.validate()
    const invalid = validateDraft(draft)
    const first = Object.keys(invalid)[0] as keyof Draft | undefined
    void action('start', geography.model.request())
    if (!validLocation) { scroll.current?.scrollTo({ y: 0, animated: true }); AccessibilityInfo.announceForAccessibility('Elegí tu provincia y localidad.'); return }
    if (first) requestAnimationFrame(() => {
      inputs.current[first]?.focus()
      AccessibilityInfo.announceForAccessibility(invalid[first]!)
    })
  }
  const heading = (title: string, subtitle: string) => <View className="gap-[8px]"><Text ref={headingRef} accessibilityRole="header" className="font-inter-700 text-[20px] leading-[28px] text-[#120F18]">{title}</Text><Text className="font-sans text-[16px] leading-[24px] text-[#605E64]">{subtitle}</Text></View>
  const button = (label: string, onPress: () => void) => <Button accessibilityLabel={label} disabled={stage === 'form' && geography.state.mode === 'detecting'} loading={busy || stage === 'verifying'} loadingLabel={`${label}…`} onPress={onPress} className={`h-[48px] rounded-[8px] disabled:opacity-100 ${busy ? 'bg-[#EEF0C1]' : 'bg-[#C9CF38]'}`}><Text className="font-inter-500 text-[14px] leading-[21px] text-[#120F18]">{label}</Text></Button>
  if (stage !== 'form') {
    const [title, subtitle, banner, detail, label, tone] = statusCopy[busyAction === 'complete' ? 'activating' : stage]
    return <Shell><ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, paddingTop: 24, gap: 16 }}>
      {heading(title, subtitle + (stage === 'pending' ? `${proof?.email}.` : ''))}
      <Banner title={notice ?? (resent ? "Email reenviado" : banner)} detail={notice ? "Intentá de nuevo." : resent ? "Revisá tu bandeja de entrada y la carpeta de spam." : detail} tone={notice ? "error" : resent ? "success" : tone} />
    </ScrollView><View className="gap-[8px] px-[16px] pb-[32px] pt-[16px]">
      {label ? button(notice ? "Reintentar" : label, () => {
        if (stage === 'active') login()
        else if (stage === 'invalid') { registration.reset(); router.replace('/register/player') }
        else void action(stage === 'verified' || stage === 'activationError' ? 'complete' : stage === 'verifyError' ? 'verify' : 'resend')
      }) : <Text accessibilityLiveRegion="polite" className="font-sans text-center text-[#605E64]">Verificando email…</Text>}
      {stage === 'pending' && <Button variant="ghost" onPress={login} className="h-[44px]">Iniciar sesión</Button>}
    </View></Shell>
  }
  return <Shell><ScrollView ref={scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={false} onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y }} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32, gap: 16 }}>
    {heading('Creá tu cuenta de jugador', 'Completá tus datos y elegí tu categoría para empezar.')}
    {notice && <Banner title={notice} detail="Intentá de nuevo." />}
    <RegistrationLocationFields model={geography.model} state={geography.state} disabled={busy} onSearchFocus={input => { locationSearch.current = input; focusedKey.current = null; setTimeout(revealFocused, 80) }} onSearchBlur={() => { locationSearch.current = null }} />
    <View className="gap-[12px]">{(['firstName', 'lastName', 'email', 'password', 'gender', 'baseCategoryId'] as const).map(key => {
      const label = { firstName: 'Nombre', lastName: 'Apellido', email: 'Email', password: 'Contraseña', gender: 'Sexo', baseCategoryId: 'Categoría' }[key]
      return <View key={key} className="gap-[8px]"><Text className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">{label}<Text className="text-[#EF4444]">*</Text></Text>
        {key === 'gender' || key === 'baseCategoryId' ? <Select value={draft[key] || undefined} onValueChange={value => setField(key, value)}>
          <SelectTrigger disabled={busy || key === 'baseCategoryId' && catalogState !== 'ready'} accessibilityRole="button" accessibilityLabel={`${label}, obligatorio, ${key === 'gender' ? draft.gender === 'MALE' ? 'Caballeros' : draft.gender === 'FEMALE' ? 'Damas' : 'sin selección' : categories.find(category => category.id === draft.baseCategoryId)?.name ?? 'sin selección'}${errors[key] ? ', ' + errors[key] : ''}`} accessibilityState={{ disabled: busy || key === 'baseCategoryId' && catalogState !== 'ready' }} className={`${fieldClass} ${errors[key] ? 'border-[#EF4444]' : ''}`} indicator={<SvgXml xml={chevronXml} />}>
            <SelectValue className={`font-inter-500 text-[14px] leading-[20px] ${draft[key] ? 'text-[#120F18]' : 'text-[#605E64]'}`} placeholder={key === 'gender' ? 'Seleccioná tu sexo' : catalogState === 'loading' ? 'Cargando categorías…' : 'Seleccioná tu categoría'} />
          </SelectTrigger><SelectContent>{(key === 'gender' ? [{ id: 'MALE', name: 'Caballeros' }, { id: 'FEMALE', name: 'Damas' }] : categories).map(option => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent>
        </Select> : <View className="relative"><TextInput ref={ref => { if (ref) inputs.current[key] = ref }} accessibilityLabel={`${label}, obligatorio${errors[key] ? ', ' + errors[key] : ''}`} editable={!busy}
          value={draft[key]} onChangeText={value => setField(key, value)} secureTextEntry={key === 'password' && !showPassword} autoCapitalize={key === 'email' || key === 'password' ? 'none' : 'words'} autoCorrect={false}
          autoComplete={{ firstName: 'given-name', lastName: 'family-name', email: 'email', password: 'new-password' }[key] as 'given-name' | 'family-name' | 'email' | 'new-password'}
          keyboardType={key === 'email' ? 'email-address' : 'default'} maxLength={key === 'firstName' || key === 'lastName' ? 100 : key === 'email' ? 255 : undefined}
          placeholder={{ firstName: 'Tu nombre', lastName: 'Tu apellido', email: 'nombre@correo.com', password: 'Creá una contraseña' }[key]} placeholderTextColor="#605E64"
          onFocus={() => { locationSearch.current = null; focusedKey.current = key; setTimeout(revealFocused, 80) }}
          className={`${fieldClass} ${errors[key] ? 'border-[#EF4444]' : ''} ${key === 'password' ? 'pr-[56px]' : ''}`} />
          {key === 'password' && <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setShowPassword(value => !value)} className="absolute right-[8px] top-[4px] h-[48px] w-[40px] items-center justify-center"><SvgXml xml={showPassword ? eyeOnXml : eyeXml} width={24} height={24} /></Pressable>}
        </View>}
        {errors[key] && <Text accessibilityRole="alert" className="text-right font-inter-500 text-[14px] leading-[20px] text-[#AA3030]">{errors[key]}</Text>}
        {key === 'baseCategoryId' && catalogState === 'error' && <View><Text className="font-sans text-sm text-[#AA3030]">No pudimos cargar las categorías.</Text><Button variant="ghost" onPress={retryCatalog}>Reintentar</Button></View>}
      </View>
    })}</View>
    <Text className="font-sans text-[16px] leading-[24px] text-[#605E64]">Vas a necesitar verificar tu email para activar tu cuenta.</Text>
    <View className="gap-[8px]">{button(notice ? 'Reintentar' : 'Crear cuenta', submit)}
      <View className="flex-row items-center justify-center gap-[8px]"><Text className="font-inter-500 text-[14px] text-[#605E64]">¿Ya tenés cuenta?</Text><Button variant="ghost" disabled={busy} onPress={login} className="h-[44px]">Iniciar sesión</Button></View>
    </View>
  </ScrollView></Shell>
}
