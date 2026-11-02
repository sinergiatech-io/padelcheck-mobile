import { Component, useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { AccessibilityInfo, Image, Platform, Text, View } from 'react-native'
import { router } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { vars } from 'nativewind'
import { useAuth } from '@/context/AuthContext'
import { StartupContext } from './StartupContext'
import { RecoveryScreen } from './RecoveryScreen'
import { initialStartupState, STARTUP_TIMEOUT_MS, startupReducer } from './startup-state'

// Call before React mounts, not in an effect. No duration minimum or fade delay.
void SplashScreen.preventAutoHideAsync().catch(() => { /* Expo Go may not own a native launch screen. */ })
SplashScreen.setOptions({ fade: false, duration: 0 })

class RouteBoundary extends Component<{ children: ReactNode; attempt: number; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  componentDidUpdate(previous: Readonly<{ attempt: number }>) {
    if (previous.attempt !== this.props.attempt && this.state.failed) this.setState({ failed: false })
  }
  render() { return this.state.failed ? null : this.props.children }
}

export function StartupProvider({ children, fontsReady, fontsLoaded }: { children: ReactNode; fontsReady: boolean; fontsLoaded: boolean }) {
  const { retryValidation, logout } = useAuth()
  const [state, dispatch] = useReducer(startupReducer, initialStartupState)
  const [destinationAttempt, setDestinationAttempt] = useState<number | null>(null)
  const [logoFailed, setLogoFailed] = useState(false)
  const [exitFailed, setExitFailed] = useState(false)
  const [exiting, setExiting] = useState(false)
  const hiddenNative = useRef(false)
  const actionFlight = useRef(false)
  const finished = state.phase === 'finished'
  const recovery = state.phase === 'failed' || state.phase === 'retrying'

  const hideNative = useCallback(() => {
    if (hiddenNative.current) return
    hiddenNative.current = true
    void SplashScreen.hideAsync().catch(() => {
      // The already-laid-out app layer remains usable if the platform API is unavailable.
      try { SplashScreen.hide() } catch { /* There is no further native handle in Expo Go. */ }
    })
  }, [])
  const fail = useCallback(() => dispatch({ type: 'failed' }), [])
  const markReady = useCallback(() => {
    if (state.phase === 'preparing') setDestinationAttempt(state.attempt)
  }, [state.phase, state.attempt])
  const value = useMemo(() => ({ attempt: state.attempt, markReady, fail }), [state.attempt, markReady, fail])

  useEffect(() => { AccessibilityInfo.announceForAccessibility('Preparando Padel Check') }, [])
  useEffect(() => {
    if (state.phase !== 'preparing') return
    const timer = setTimeout(fail, STARTUP_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [state.phase, state.attempt, fail])
  useEffect(() => {
    if (state.phase !== 'preparing' || !fontsReady || destinationAttempt !== state.attempt) return
    // Synchronize with the rendered native view; never hold for branding/animation.
    const frame = requestAnimationFrame(() => { hideNative(); dispatch({ type: 'ready' }) })
    return () => cancelAnimationFrame(frame)
  }, [state.phase, state.attempt, fontsReady, destinationAttempt, hideNative])

  const retry = async () => {
    if (actionFlight.current || state.phase !== 'failed') return
    actionFlight.current = true
    const attempt = state.attempt + 1
    setDestinationAttempt(null)
    dispatch({ type: 'retry' })
    try {
      await retryValidation()
      dispatch({ type: 'prepared', attempt })
    } catch {
      dispatch({ type: 'retry-failed', attempt })
    } finally { actionFlight.current = false }
  }
  const exit = async () => {
    if (actionFlight.current) return
    actionFlight.current = true
    setExiting(true)
    try {
      if (!(await logout())) { setExitFailed(true); return }
      router.replace('/login')
      setDestinationAttempt(null)
      dispatch({ type: 'retry' })
      dispatch({ type: 'prepared', attempt: state.attempt + 1 })
    } finally { actionFlight.current = false; setExiting(false) }
  }
  const systemFont = Platform.OS === 'ios' ? 'System' : 'sans-serif'
  const fontVariables = vars({
    '--font-regular': fontsLoaded ? 'Inter_400Regular' : systemFont,
    '--font-medium': fontsLoaded ? 'Inter_500Medium' : systemFont,
    '--font-semibold': fontsLoaded ? 'Inter_600SemiBold' : systemFont,
    '--font-bold': fontsLoaded ? 'Inter_700Bold' : systemFont,
  })

  return (
    <StartupContext.Provider value={value}>
      <View style={[{ flex: 1, backgroundColor: '#120F18' }, fontVariables]}>
        <View style={{ flex: 1 }} pointerEvents={finished ? 'auto' : 'none'}
          accessibilityElementsHidden={!finished} importantForAccessibility={finished ? 'auto' : 'no-hide-descendants'}>
          <RouteBoundary attempt={state.attempt} onError={fail}>{children}</RouteBoundary>
        </View>
        {!finished && <View style={{ position: 'absolute', inset: 0, backgroundColor: '#120F18' }}>
          <StatusBar style="light" />
          {recovery ? <RecoveryScreen failures={state.failures} busy={state.phase === 'retrying' || exiting} exiting={exiting} exitFailed={exitFailed}
            onRetry={() => void retry()} onExit={() => void exit()} onLayout={hideNative} /> : (
            <View testID="startup-brand" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel="Preparando Padel Check">
              {logoFailed ? <Text style={{ fontSize: 24, fontWeight: '600', color: '#C9CF38' }}>Padel Check</Text> : (
                <Image source={require('../../../assets/splash-icon.png')} resizeMode="contain" accessible={false} onError={() => setLogoFailed(true)} style={{ width: 216, height: 216 }} />
              )}
            </View>
          )}
        </View>}
      </View>
    </StartupContext.Provider>
  )
}
