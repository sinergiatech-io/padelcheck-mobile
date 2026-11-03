import { useEffect, useMemo, useRef, useState, type ElementRef } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { AccessibilityInfo, findNodeHandle, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { StartupReady } from '@/features/startup/StartupReady'
import { useRecovery } from './use-recovery'
import { recoveryCopy } from './recovery-copy'
import { clearRecoveryLink, readRecoveryLink } from './recovery-link'
import { eyeXml, eyeOnXml } from './auth-icons'
import { recoveryCourtXml } from './recovery-assets'
import { successXml } from './register-icons'

export function PasswordRecoveryScreen({ reset = false }: { reset?: boolean }) {
  const { attempt } = useLocalSearchParams<{ attempt?: string }>()
  const link = useMemo(() => reset ? readRecoveryLink() : undefined, [attempt, reset])
  useEffect(() => { if (reset) clearRecoveryLink() }, [attempt, reset])
  return <RecoveryForm key={`${reset}-${link?.id ?? 0}`} token={reset ? link?.token ?? '' : undefined} />
}
function RecoveryForm({ token }: { token?: string }) {
  const { machine, state, blocked } = useRecovery(Platform.OS === 'ios' ? 'IOS' : 'ANDROID', token)
  const copy = recoveryCopy(state)
  const insets = useSafeAreaInsets()
  const [keyboard, setKeyboard] = useState(false)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const heading = useRef<ElementRef<typeof Text>>(null)
  const scroll = useRef<ElementRef<typeof ScrollView>>(null)
  const inputs = useRef<Partial<Record<string, ElementRef<typeof TextInput>>>>({})
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false))
    return () => { show.remove(); hide.remove() }
  }, [])
  useEffect(() => {
    Keyboard.dismiss()
    const handle = findNodeHandle(heading.current)
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle)
    AccessibilityInfo.announceForAccessibility(copy.title)
  }, [state.stage, copy.title])
  useEffect(() => { if (state.notice) AccessibilityInfo.announceForAccessibility(state.notice) }, [state.notice])
  const leave = (path: '/login' | '/forgot-password') => { machine.cancel(); router.replace(path) }
  const submit = async () => {
    if (state.stage === 'success') return leave('/login')
    if (state.stage === 'invalid') return leave('/forgot-password')
    await machine.run()
    const invalid = Object.keys(machine.state.errors).find(key => machine.state.errors[key as keyof typeof machine.state.errors])
    if (invalid) inputs.current[invalid]?.focus()
  }
  const keys = state.stage === 'request' ? ['email'] as const : state.stage === 'password' ? ['password', 'confirmPassword'] as const : []
  const busyLabel = state.stage === 'request' ? 'Enviando…' : state.stage === 'password' ? 'Guardando…' : state.stage === 'cleanup' ? 'Cerrando sesión…' : 'Verificando enlace…'
  return <StartupReady><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-[#120F18]" style={{ paddingTop: insets.top }}>
    <View style={{ height: keyboard ? 72 : 204, overflow: 'hidden' }}>
      <SvgXml xml={recoveryCourtXml} width="100%" height={228} />
      <Image source={require('../../../assets/auth/logo.png')} accessibilityLabel="Padel Check" resizeMode="contain" style={{ position: 'absolute', top: keyboard ? 8 : 51, left: '50%', marginLeft: keyboard ? -28 : -52, width: keyboard ? 56 : 104, height: keyboard ? 55 : 102.525 }} />
    </View>
    <View className="min-h-0 flex-1 overflow-hidden rounded-t-[24px] bg-[#FEFEFE]" style={{ paddingBottom: keyboard ? 0 : insets.bottom }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-[20px] px-[16px] pb-[24px] pt-[32px]">
          <Text ref={heading} accessibilityRole="header" className="font-inter-600 text-[24px] leading-[32px] text-[#120F18]">{copy.title}</Text>
          {!!copy.detail && <Text className="font-sans text-[16px] leading-[24px] text-[#605E64]">{copy.detail}</Text>}
          {state.notice && <View accessibilityRole="alert" className="rounded-[8px] border border-[#FAC5C5] bg-[#FDECEC] p-[12px]"><Text className="font-inter-600 text-[14px] leading-[20px] text-[#120F18]">{state.notice}</Text><Text className="font-sans text-[12px] leading-[16px] text-[#605E64]">{state.retryAt > Date.now() ? 'Intentá de nuevo cuando termine el límite indicado por el servidor.' : state.stage === 'request' ? 'Intentá de nuevo en unos minutos.' : 'Intentá de nuevo.'}</Text></View>}
          {state.stage === 'success' && <View accessibilityRole="alert" className="flex-row items-center gap-[12px] rounded-[8px] border border-[#BAEDCD] bg-[#E9F9EF] p-[12px]"><SvgXml xml={successXml} width={24} height={24} /><View className="flex-1"><Text className="font-inter-600 text-[14px] leading-[20px] text-[#120F18]">Dos formas de ingresar</Text><Text className="mt-[2px] font-sans text-[12px] leading-[16px] text-[#605E64]">Podés usar tu email y contraseña. Si vinculaste Google, también sigue disponible.</Text></View></View>}
          {keys.map(key => {
            const label = key === 'email' ? 'Email' : key === 'password' ? 'Nueva contraseña' : 'Confirmar contraseña'
            return <View key={key} className="gap-[8px]"><Text nativeID={`${key}-label`} className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">{label}</Text><View className="relative">
              <TextInput ref={ref => { if (ref) inputs.current[key] = ref }} value={state.fields[key]} onChangeText={value => machine.setField(key, value)} editable={!state.busy}
                accessibilityLabel={`${label}, obligatorio${state.errors[key] ? ', ' + state.errors[key] : ''}`} accessibilityLabelledBy={`${key}-label`}
                secureTextEntry={key !== 'email' && !visible[key]} autoCapitalize="none" autoCorrect={false} autoComplete={key === 'email' ? 'email' : 'new-password'}
                keyboardType={key === 'email' ? 'email-address' : 'default'} maxLength={key === 'email' ? 254 : undefined}
                placeholder={key === 'email' ? 'nombre@correo.com' : ''} placeholderTextColor="#605E64"
                onFocus={() => { if (key === 'confirmPassword') setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 150) }}
                className={`h-[56px] rounded-[8px] border bg-[#FEFEFE] px-[16px] font-inter-500 text-[14px] text-[#120F18] ${state.errors[key] ? 'border-[#EF4444]' : 'border-[#929195]'} ${key !== 'email' ? 'pr-[56px]' : ''}`} />
              {key !== 'email' && <Pressable accessibilityRole="button" accessibilityLabel={`${visible[key] ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} onPress={() => setVisible(value => ({ ...value, [key]: !value[key] }))} className="absolute right-[4px] top-[4px] h-[48px] w-[48px] items-center justify-center"><SvgXml xml={visible[key] ? eyeOnXml : eyeXml} width={24} height={24} /></Pressable>}
            </View>{state.errors[key] && <Text accessibilityRole="alert" className="text-right font-inter-500 text-[14px] leading-[20px] text-[#AA3030]">{state.errors[key]}</Text>}</View>
          })}
          {copy.help && <Text className="font-sans text-[16px] leading-[24px] text-[#605E64]">{copy.help}</Text>}
          {state.busy && <Text accessibilityLiveRegion="polite" className="sr-only">{busyLabel}</Text>}
        </View>
        <View className="mt-auto gap-[8px] px-[16px] pb-[24px] pt-[16px]">
          {!!copy.action && <Button onPress={() => void submit()} disabled={blocked || state.stage === 'inspect'} loading={state.busy} loadingLabel={busyLabel} className="h-[48px] rounded-[8px]">{copy.action}</Button>}
          {state.stage !== 'success' && <Button variant="secondary" onPress={() => leave('/login')} className="h-[48px] rounded-[8px] border-[#929195]">Volver al acceso</Button>}
        </View>
      </ScrollView>
    </View>
  </KeyboardAvoidingView></StartupReady>
}
