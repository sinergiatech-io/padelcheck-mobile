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
  logout: (notice?: 'expired') => Promise<void>
  retryValidation: () => void
  isAuthenticated: boolean
  isLoading: boolean
  destination: AccessDestination | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_KEY = 'padelcheck_user'
const EXPIRES_KEY = 'padelcheck_session_expires_at'

async function readUser(): Promise<AuthPrincipal | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthPrincipal) : null
  } catch {
    return null
  }
}

async function readExpires(): Promise<number | null> {
  try {
    const raw = await SecureStore.getItemAsync(EXPIRES_KEY)
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

async function clearPrivateSession() {
  try {
    await clearStoredToken()
  } catch {
    /* token may already be absent */
  }
  try {
    await SecureStore.deleteItemAsync(USER_KEY)
  } catch {
    /* key may already be absent */
  }
  try {
    await SecureStore.deleteItemAsync(EXPIRES_KEY)
  } catch {
    /* key may already be absent */
  }
  queryClient.clear()
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

  const logout = useCallback(async (notice?: 'expired') => {
    bumpSessionGeneration()
    await clearPrivateSession()
    if (notice === 'expired') rememberExpiredLoginNotice()
    setState({ phase: 'anonymous', user: null, token: null, expiresAt: null })
  }, [])

  const validate = useCallback(async (token: string, expiresAt: number | null) => {
    const generation = bumpSessionGeneration()
    if (expiresAt !== null && Date.now() >= expiresAt) {
      if (decideSessionCheck({ attempt: generation, current: currentSessionGeneration(), error: null }) !== 'ready') return
      await logout('expired')
      return
    }
    try {
      const user = await fetchCurrentUser()
      if (decideSessionCheck({ attempt: generation, current: currentSessionGeneration(), error: null }) !== 'ready') return
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
      if (decideSessionCheck({ attempt: generation, current: currentSessionGeneration(), error: null }) !== 'ready') return
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
      setState({ phase: 'unverified', user: null, token, expiresAt })
    }
  }, [logout])

  const login = useCallback(async (token: string, user: AuthPrincipal, expiresIn: number) => {
    const generation = bumpSessionGeneration()
    const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0 ? Date.now() + expiresIn * 1000 : null
    await setStoredToken(token)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
    if (expiresAt === null) {
      try {
        await SecureStore.deleteItemAsync(EXPIRES_KEY)
      } catch {
        /* absent expiry is valid */
      }
    } else {
      await SecureStore.setItemAsync(EXPIRES_KEY, String(expiresAt))
    }
    if (generation !== currentSessionGeneration()) {
      await clearPrivateSession()
      return false
    }
    setState({ phase: 'ready', user, token, expiresAt })
    return true
  }, [])

  const retryValidation = useCallback(() => {
    const generation = bumpSessionGeneration()
    void (async () => {
      const token = await getStoredToken()
      if (generation !== currentSessionGeneration()) return
      if (!token) {
        await logout()
        return
      }
      setState((current) => ({ ...current, phase: 'checking' }))
      await validate(token, await readExpires())
    })()
  }, [logout, validate])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const token = await getStoredToken()
      const storedUser = await readUser()
      if (cancelled) return
      if (!token || !storedUser) {
        await clearPrivateSession()
        if (!cancelled) setState({ phase: 'anonymous', user: null, token: null, expiresAt: null })
        return
      }
      await validate(token, await readExpires())
    })()
    return () => {
      cancelled = true
    }
  }, [validate])

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
    isAuthenticated: state.phase === 'ready' && !!state.token && !!state.user,
    isLoading: state.phase === 'checking',
    destination,
  }), [destination, login, logout, retryValidation, state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
