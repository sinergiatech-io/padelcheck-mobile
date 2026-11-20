import { useEffect, useState, type ReactNode } from 'react'
import { Image, Keyboard, KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { StartupReady } from '@/features/startup/StartupReady'
import { courtXml } from './auth-icons'
import { infoXml, successXml, errorXml, warningXml } from './register-icons'

const tones = { info: 'border-[#C2D8FC] bg-[#EBF3FE]', success: 'border-[#BAEDCD] bg-[#E9F9EF]', error: 'border-[#FAC5C5] bg-[#FDECEC]', warning: 'border-[#FCE1B3] bg-[#FEF5E7]' }
export type BannerTone = keyof typeof tones

export function Banner({ title, detail, tone = 'error' }: { title: string; detail: string; tone?: BannerTone }) {
  return <View accessibilityRole="alert" className={`flex-row items-center gap-[12px] rounded-[8px] border p-[12px] ${tones[tone]}`}>
    <View className="h-[24px] w-[24px] items-center justify-center"><SvgXml xml={{ info: infoXml, success: successXml, error: errorXml, warning: warningXml }[tone]} /></View>
    <View className="min-w-0 flex-1"><Text className="font-inter-600 text-[14px] leading-[20px] text-[#120F18]">{title}</Text><Text className="mt-[2px] font-sans text-[12px] leading-[16px] text-[#605E64]">{detail}</Text></View>
  </View>
}

/**
 * Dark court header + light rounded surface. The header compacts while the keyboard is open.
 * `avoidKeyboard` (wizard with a fixed footer) lifts the surface above the keyboard on Android, where the edge-to-edge
 * window is not resized; iOS already uses the KeyboardAvoidingView padding. The player form keeps its previous behavior.
 */
export function Shell({ children, avoidKeyboard = false, identity = false }: { children: ReactNode; avoidKeyboard?: boolean; identity?: boolean }) {
  const insets = useSafeAreaInsets()
  const [keyboard, setKeyboard] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event => { setKeyboard(true); setKeyboardHeight(event.endCoordinates.height) })
    const hide = Keyboard.addListener('keyboardDidHide', () => { setKeyboard(false); setKeyboardHeight(0) })
    return () => { show.remove(); hide.remove() }
  }, [])
  const lift = avoidKeyboard && Platform.OS === 'android' && keyboard ? keyboardHeight + insets.bottom : 0
  return <StartupReady><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-[#120F18]" style={{ paddingTop: insets.top }}>
    <View style={{ height: keyboard ? 72 : identity ? 203 : 124, overflow: 'hidden' }}>
      <SvgXml xml={courtXml} width="100%" height={identity ? 203 : 172} />
      <Image source={require('../../../assets/auth/logo.png')} accessibilityLabel="Padel Check" resizeMode="contain" style={{ position: 'absolute', top: keyboard ? 8 : identity ? 47 : 16, left: '50%', marginLeft: keyboard ? -28 : identity ? -52 : -46, width: keyboard ? 56 : identity ? 104 : 92, height: keyboard ? 55 : identity ? 104 : 91 }} />
    </View>
    <View className="min-h-0 flex-1 overflow-hidden rounded-t-[24px] bg-[#FEFEFE]" style={{ paddingBottom: keyboard ? lift : insets.bottom }}>{children}</View>
  </KeyboardAvoidingView></StartupReady>
}

export const fieldClass = 'h-[56px] rounded-[8px] border border-[#929195] bg-[#FEFEFE] px-[16px] font-inter-500 text-[14px] text-[#120F18]'
