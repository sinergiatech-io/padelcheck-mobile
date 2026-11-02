import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, findNodeHandle, Image, ScrollView, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { courtXml } from '@/features/auth/auth-icons'
import { recoveryIconXml } from './recovery-icons'

const logo = require('../../../assets/auth/logo.png')

export interface RecoveryProps {
  kind?: 'technical' | 'session'
  failures?: number
  busy?: boolean
  exiting?: boolean
  exitFailed?: boolean
  onRetry: () => void
  onExit: () => void
  onLayout?: () => void
}

export function RecoveryScreen({ kind = 'technical', failures = 1, busy = false, exiting = false, exitFailed = false, onRetry, onExit, onLayout }: RecoveryProps) {
  const insets = useSafeAreaInsets()
  const heading = useRef<React.ComponentRef<typeof Text>>(null)
  const [logoFailed, setLogoFailed] = useState(false)
  const [laidOut, setLaidOut] = useState(false)
  const session = kind === 'session'
  const retrying = busy && !exiting
  const title = retrying ? 'Estamos preparando el inicio' : session ? 'No pudimos verificar tu sesión.' : 'No pudimos iniciar Padel Check'
  const repeated = failures > 1
  const showExit = session || repeated || exitFailed

  useEffect(() => {
    if (!laidOut || busy) return
    const frame = requestAnimationFrame(() => {
      const handle = findNodeHandle(heading.current)
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle)
    })
    return () => cancelAnimationFrame(frame)
  }, [laidOut, busy, failures])

  return (
    <View testID="startup-recovery" style={{ flex: 1, backgroundColor: '#120F18', paddingTop: insets.top }}
      onLayout={() => { setLaidOut(true); onLayout?.() }}>
      <StatusBar style="light" />
      <View style={{ height: 148, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}><SvgXml xml={courtXml} width="100%" height={172} /></View>
        {logoFailed ? <Text style={{ color: '#C9CF38', fontSize: 24, fontWeight: '600' }}>Padel Check</Text> : (
          <Image source={logo} accessibilityLabel="Padel Check" resizeMode="contain" onError={() => setLogoFailed(true)} style={{ width: 92, height: 90.695 }} />
        )}
      </View>
      <View style={{ flex: 1, minHeight: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#FEFEFE', paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 24, gap: 24 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 24 }}>
          <Text ref={heading} accessibilityRole="header" className="font-inter-600" style={{ color: '#120F18', fontSize: 24, lineHeight: 32 }}>{title}</Text>
          {(!session || retrying) && (
            <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11,
              borderColor: retrying ? '#C2D8FC' : repeated ? '#FCE1B3' : '#FAC5C5', backgroundColor: retrying ? '#EBF3FE' : repeated ? '#FEF5E7' : '#FDECEC' }}>
              {!retrying && <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}><SvgXml xml={recoveryIconXml} width={20} height={20} /></View>}
              <View style={{ flex: 1, gap: 2 }}>
                <Text className="font-inter-600" style={{ color: '#120F18', fontSize: 14, lineHeight: 20 }}>{retrying ? 'Reintentando' : repeated ? 'El problema continúa' : 'El inicio se interrumpió'}</Text>
                <Text className="font-sans" style={{ color: '#605E64', fontSize: 12, lineHeight: 16 }}>{retrying ? 'La pantalla estará disponible al terminar.' : repeated ? 'Podés reintentar o volver al acceso.' : 'Volvé a intentarlo para continuar.'}</Text>
              </View>
            </View>
          )}
          {exitFailed && <Text accessibilityRole="alert" className="font-sans" style={{ color: '#605E64', fontSize: 14, lineHeight: 20 }}>No pudimos cerrar la sesión local. Volvé a intentarlo.</Text>}
        </ScrollView>
        <View style={{ gap: 12 }}>
          <Button testID="startup-retry" className="disabled:opacity-100" disabled={busy} loading={retrying} loadingLabel="Reintentando" accessibilityLabel="Reintentar" onPress={onRetry}
            style={{ minHeight: 48, height: 'auto', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: retrying ? '#EEF0C1' : '#C9CF38' }}>
            <Text className="font-inter-500" style={{ color: '#120F18', fontSize: 14, lineHeight: 21 }}>Reintentar</Text>
          </Button>
          {showExit && <Button testID="startup-exit" className="disabled:opacity-100" disabled={busy} loading={exiting} loadingLabel="Volviendo al acceso" accessibilityLabel="Volver al acceso" onPress={onExit}
            style={{ minHeight: 48, height: 'auto', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#E7E7E8' }}>
            <Text className="font-inter-500" style={{ color: '#413F46', fontSize: 14, lineHeight: 21 }}>Volver al acceso</Text>
          </Button>}
        </View>
      </View>
    </View>
  )
}
