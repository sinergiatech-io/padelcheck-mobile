import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import * as SecureStore from 'expo-secure-store'
import { getStoredToken, setStoredToken, clearStoredToken } from '@/lib/auth'
import type { AuthPrincipal } from '@/types/auth'

interface AuthState {
  user: AuthPrincipal | null
  token: string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: AuthPrincipal) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const AUTH_STORAGE_KEY = 'padelcheck_user'

async function getStoredUser(): Promise<AuthPrincipal | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthPrincipal) : null
  } catch {
    return null
  }
}

async function setStoredUser(user: AuthPrincipal): Promise<void> {
  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(user))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  })

  const login = useCallback(async (token: string, user: AuthPrincipal) => {
    await setStoredToken(token)
    await setStoredUser(user)
    setState({ user, token, isLoading: false })
  }, [])

  const logout = useCallback(async () => {
    await clearStoredToken()
    try {
      await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY)
    } catch {
      /* key may not exist */
    }
    setState({ user: null, token: null, isLoading: false })
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [token, user] = await Promise.all([getStoredToken(), getStoredUser()])
      if (cancelled) return
      if (!token || !user) {
        setState({ user: null, token: null, isLoading: false })
        return
      }
      setState({ user, token, isLoading: false })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    isAuthenticated: !!state.token && !!state.user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
