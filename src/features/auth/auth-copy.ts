import { ApiError } from '@/lib/api-client'
import type { ContinueReason } from './access-destination'

export const AUTH_COPY = {
  invalidCredentials: 'El email o la contraseña son incorrectos.',
  unverifiedEmail: 'Verificá tu email para iniciar sesión.',
  blocked: 'Tu cuenta está bloqueada. No podés iniciar sesión.',
  unavailableAccount: 'No podemos habilitar el acceso a esta cuenta.',
  network: 'No pudimos conectarnos. Intentá de nuevo.',
  unknownLogin: 'No pudimos iniciar sesión. Intentá de nuevo.',
  sessionUnverified: 'No pudimos verificar tu sesión.',
  expired: 'Tu sesión venció. Iniciá sesión para continuar.',
  multiple: 'Necesitás elegir cómo continuar.',
  pending: 'Tu cuenta requiere completar la configuración.',
  emptyContext: 'No hay un contexto de acceso disponible para esta cuenta.',
  continuationLater: 'Esa continuación todavía no está disponible.',
  registerLater: 'Todavía no está disponible.',
  retry: 'Reintentar comprobación',
  retrySession: 'Reintentar',
  backToAccess: 'Volver al acceso',
} as const

export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return AUTH_COPY.network
  if (error.kind === 'network' || error.kind === 'timeout' || error.status >= 500) return AUTH_COPY.network
  switch (error.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return AUTH_COPY.invalidCredentials
    case 'AUTH_EMAIL_UNVERIFIED':
      return AUTH_COPY.unverifiedEmail
    case 'AUTH_ACCOUNT_BLOCKED':
      return AUTH_COPY.blocked
    case 'AUTH_ACCOUNT_UNAVAILABLE':
      return AUTH_COPY.unavailableAccount
    default:
      return AUTH_COPY.unknownLogin
  }
}

export function continueMessage(reason: ContinueReason): { title: string; detail?: string } {
  if (reason === 'multiple-activities') {
    return { title: AUTH_COPY.multiple, detail: AUTH_COPY.continuationLater }
  }
  if (reason === 'pending-setup') {
    return { title: AUTH_COPY.pending, detail: AUTH_COPY.continuationLater }
  }
  return { title: AUTH_COPY.emptyContext }
}
