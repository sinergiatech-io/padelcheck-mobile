import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AppState } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { fetchCurrentUser } from '@/features/auth/api/me'
import { resolveAccessDestination, type AccessDestination } from '@/features/auth/access-destination'
import { rememberExpiredLoginNotice } from '@/features/auth/login-notice'
import { decideSessionCheck } from '@/features/auth/session-check'
import { bumpSessionGeneration, currentSessionGeneration } from '@/features/auth/session-generation'
import { ApiError } from '@/lib/api-client'
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/auth'
import { setHttpErrorListener } from '@/lib/http-client'
import { queryClient } from '@/lib/query-client'
import { StorageUnavailableError, withStorageDeadline } from '@/lib/storage-deadline'
import type { AuthPrincipal } from '@/types/auth'

export type SessionPhase = 'checking' | 'anonymous' | 'ready' | 'unverified'

interface AuthState {
  phase: SessionPhase
  user: AuthPrincipal | null
  token: string | null
  expiresAt: number | null
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: AuthPrincipal, expiresIn: number) => Promise<boolean>
  logout: (notice?: 'expired') => Promise<boolean>
  retryValidation: () => Promise<void>
  storageError: boolean
  isAuthenticated: boolean
  isLoading: boolean
  destination: AccessDestination | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_KEY = 'padelcheck_user'
const EXPIRES_KEY = 'padelcheck_session_expires_at'

async function readExpires(): Promise<number | null> {
  const raw = await withStorageDeadline(() => SecureStore.getItemAsync(EXPIRES_KEY))
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new StorageUnavailableError()
  return value
}

async function clearPrivateSession() {
  queryClient.clear()
  const results = await Promise.allSettled([
    clearStoredToken(),
    withStorageDeadline(() => SecureStore.deleteItemAsync(USER_KEY)),
    withStorageDeadline(() => SecureStore.deleteItemAsync(EXPIRES_KEY)),
  ])
  if (results.some(result => result.status === 'rejected')) throw new StorageUnavailableError()
}

function errorPath(error: ApiError): string {
  const details = error.details
  if (!details || typeof details !== 'object' || !('path' in details)) return ''
  return typeof details.path === 'string' ? details.path : ''
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    phase: 'checking',
    user: null,
    token: null,
    expiresAt: null,
  })
  const stateRef = useRef(state)
  stateRef.current = state
  const [storageError, setStorageError] = useState(false)
  const restoreFlight = useRef<Promise<void> | null>(null)

  const logout = useCallback(async (notice?: 'expired') => {
    bumpSessionGeneration()
    // Retire in-memory authorization immediately, even if native deletion fails.
    setState(current => ({ phase: current.phase === 'unverified' ? 'unverified' : 'checking', user: null, token: null, expiresAt: null }))
    try {
      await clearPrivateSession()
    } catch {
      setStorageError(true)
      setState({ phase: 'unverified', user: null, token: null, expiresAt: null })
      return false
    }
    setStorageError(false)
    if (notice === 'expired') rememberExpiredLoginNotice()
    setState({ phase: 'anonymous', user: null, token: null, expiresAt: null })
    return true
  }, [])

  const validate = useCallback(async (token: string, expiresAt: number | null, generation = bumpSessionGeneration()) => {
    if (expiresAt !== null && Date.now() >= expiresAt) {
      if (decideSessionCheck({ attempt: generation, current: currentSessionGeneration(), error: null }) !== 'ready') return
      await logout('expired')
      return
    }
    try {
      const user = await fetchCurrentUser()
      if (decideSessionCheck({ attempt: generation, current: currentSessionGeneration(), error: null }) !== 'ready') return
      await withStorageDeadline(() => SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)))
      if (decideSessionCheck({ attempt: generation, current: currentSessionGeneration(), error: null }) !== 'ready') return
      setStorageError(false)
      setState({ phase: 'ready', user, token, expiresAt })
    } catch (error) {
      const decision = decideSessionCheck({
        attempt: generation,
        current: currentSessionGeneration(),
        error: error instanceof ApiError ? error : { status: 0 },
      })
      if (decision === 'ignore') return
      if (decision === 'expired') {
        await logout('expired')
        return
      }
      setStorageError(error instanceof StorageUnavailableError)
      setState({ phase: 'unverified', user: null, token, expiresAt })
    }
  }, [logout])

  const login = useCallback(async (token: string, user: AuthPrincipal, expiresIn: number) => {
    const generation = bumpSessionGeneration()
    const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0 ? Date.now() + expiresIn * 1000 : null
    await setStoredToken(token)
    await withStorageDeadline(() => SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)))
    if (expiresAt === null) {
      try {
        await withStorageDeadline(() => SecureStore.deleteItemAsync(EXPIRES_KEY))
      } catch {
        /* absent expiry is valid */
      }
    } else {
      await withStorageDeadline(() => SecureStore.setItemAsync(EXPIRES_KEY, String(expiresAt)))
    }
    if (generation !== currentSessionGeneration()) {
      await clearPrivateSession()
      return false
    }
    setStorageError(false)
    setState({ phase: 'ready', user, token, expiresAt })
    return true
  }, [])

  const retryValidation = useCallback(() => {
    if (restoreFlight.current) return restoreFlight.current
    const generation = bumpSessionGeneration()
    const flight = (async () => {
      try {
        const [token, expiresAt] = await Promise.all([getStoredToken(), readExpires()])
        if (generation !== currentSessionGeneration()) return
        if (!token) {
          await logout()
          return
        }
        // During a recovery retry keep its actions mounted and busy; protected content stays blocked.
        setState(current => ({ ...current, phase: current.phase === 'unverified' ? 'unverified' : 'checking' }))
        await validate(token, expiresAt, generation)
      } catch {
        if (generation !== currentSessionGeneration()) return
        setStorageError(true)
        setState({ phase: 'unverified', user: null, token: null, expiresAt: null })
      }
    })()
    restoreFlight.current = flight
    void flight.finally(() => { if (restoreFlight.current === flight) restoreFlight.current = null })
    return flight
  }, [logout, validate])

  useEffect(() => {
    // A missing/corrupt cached principal is not authority; /me validates the token.
    void retryValidation()
    return () => { bumpSessionGeneration(); restoreFlight.current = null }
  }, [retryValidation])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return
      const current = stateRef.current
      if (current.phase !== 'ready' || !current.token) return
      setState((value) => ({ ...value, phase: 'checking' }))
      void validate(current.token as string, current.expiresAt)
    })
    return () => subscription.remove()
  }, [validate])

  useEffect(() => {
    if (state.phase !== 'ready' || state.expiresAt === null) return
    const delay = state.expiresAt - Date.now()
    if (delay <= 0) {
      void logout('expired')
      return
    }
    const timer = setTimeout(() => void logout('expired'), delay)
    return () => clearTimeout(timer)
  }, [logout, state.expiresAt, state.phase])

  useEffect(() => {
    setHttpErrorListener((error) => {
      if (error.kind !== 'http') return
      const path = errorPath(error)
      if (path.includes('/auth/login')) return
      if (error.status === 401 && error.code !== 'AUTH_INVALID_CREDENTIALS') {
        if (stateRef.current.phase === 'anonymous') return
        void logout('expired')
        return
      }
      if (error.status === 403 && error.code === 'AUTH_FORBIDDEN' && !path.includes('/auth/me')) {
        const current = stateRef.current
        if (current.phase !== 'ready' || !current.token) return
        setState((value) => ({ ...value, phase: 'checking' }))
        void validate(current.token as string, current.expiresAt)
      }
    })
    return () => setHttpErrorListener(null)
  }, [logout, validate])

  const destination = state.phase === 'ready' && state.user
    ? resolveAccessDestination(state.user.accessContexts)
    : null

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    logout,
    retryValidation,
    storageError,
    isAuthenticated: state.phase === 'ready' && !!state.token && !!state.user,
    isLoading: state.phase === 'checking',
    destination,
  }), [destination, login, logout, retryValidation, state, storageError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
