import { resolveApiBase, isLocalEnvironment } from './api-config'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

export const APP_NAME = 'Padel Check'

/** Expo Router paths (route groups omitidos en la URL). */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  designSystem: '/design-system',
  dashboard: '/dashboard',
  events: '/events',
  eventLocation: '/events/location',
} as const

/** Rutas bajo `/events/:eventId/*`. */
export function eventRoutes(eventId: string) {
  const base = `/events/${eventId}`
  return {
    detail: base,
    category: (categoryId: string, tab: string) => `${base}/categories/${categoryId}/${tab}`,
    categoryEnroll: (categoryId: string) => `${base}/categories/${categoryId}/enroll`,
  } as const
}

const envBase = process.env.EXPO_PUBLIC_API_BASE_URL

/** IP/host de la máquina del bundler (tu PC) para Expo Go en LAN. */
function getDevHost(): string | null {
  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null | undefined)?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig
      ?.debuggerHost ??
    null
  if (typeof hostUri !== 'string') return null
  const host = hostUri.split(':')[0]?.trim()
  if (!host || host === 'localhost' || host === '127.0.0.1') return null
  return host
}

function defaultApiBase(): string {
  if (isLocalEnvironment(process.env.EXPO_PUBLIC_APP_ENV, __DEV__)) {
    const host = getDevHost()
    if (host) return `http://${host}:8080/api`
    if (Platform.OS === 'android') return 'http://10.0.2.2:8080/api'
    return 'http://localhost:8080/api'
  }
  return ''
}

export const API_BASE = resolveApiBase(
  envBase,
  isLocalEnvironment(process.env.EXPO_PUBLIC_APP_ENV, __DEV__),
  defaultApiBase(),
)
