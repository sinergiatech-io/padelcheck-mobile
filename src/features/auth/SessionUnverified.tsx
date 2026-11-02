import { useRef, useState } from 'react'
import { router } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { RecoveryScreen } from '@/features/startup/RecoveryScreen'
import { StartupReady } from '@/features/startup/StartupReady'

export function SessionUnverified() {
  const { retryValidation, logout, storageError } = useAuth()
  const [busy, setBusy] = useState(false)
  const [failures, setFailures] = useState(1)
  const [exitFailed, setExitFailed] = useState(false)
  const [exiting, setExiting] = useState(false)
  const inFlight = useRef(false)
  const retry = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    try { await retryValidation(); setFailures(value => value + 1) }
    finally { inFlight.current = false; setBusy(false) }
  }
  const exit = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setExiting(true)
    try {
      if (await logout()) router.replace('/login')
      else setExitFailed(true)
    } finally { inFlight.current = false; setBusy(false); setExiting(false) }
  }
  return <StartupReady><RecoveryScreen kind={storageError ? 'technical' : 'session'} busy={busy} exiting={exiting} failures={failures}
    exitFailed={exitFailed} onRetry={() => void retry()} onExit={() => void exit()} /></StartupReady>
}
