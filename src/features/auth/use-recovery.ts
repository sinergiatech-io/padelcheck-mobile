import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { API_BASE } from '@/lib/constants'
import { createApiClient } from '@/lib/http-client'
import { useAuth } from '@/context/AuthContext'
import { RecoveryMachine, type RecoveryPlatform } from './recovery-machine'

// Public recovery never sends the previous session's bearer or cookies.
const recoveryClient = createApiClient({ baseUrl: API_BASE, getToken: () => null, credentials: 'omit' })
export function useRecovery(platform: RecoveryPlatform, token?: string) {
  const { logout } = useAuth()
  const [machine] = useState(() => new RecoveryMachine(recoveryClient, platform, token, logout))
  const state = useSyncExternalStore(machine.subscribe, machine.snapshot)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (state.retryAt <= Date.now()) return
    const timer = setTimeout(() => setNow(Date.now()), Math.min(state.retryAt - Date.now(), 2147483647))
    return () => clearTimeout(timer)
  }, [state.retryAt, now])
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; queueMicrotask(() => { if (!mounted.current) machine.cancel() }) }
  }, [machine])
  useEffect(() => {
    if (machine.state.stage === 'inspect') void machine.run()
    // StrictMode effect replay must not erase the proof; page owners cancel on departure.
  }, [machine])
  return { machine, state, blocked: state.busy || state.retryAt > Math.max(now, Date.now()) }
}
