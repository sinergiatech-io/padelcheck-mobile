import { ApiError } from '@/lib/api-client'
import type { ContinueReason } from './access-destination'

export type LoginBannerTone = 'error' | 'warning' | 'neutral'

export type LoginNotice = {
  tone: LoginBannerTone
  title: string
  detail?: string
  code?: string
}

export const AUTH_COPY = {
  invalidCredentialsTitle: 'Email o contraseña incorrectos',
  invalidCredentialsDetail: 'Revisá los datos e intentá de nuevo.',
  unverifiedTitle: 'Falta verificar tu email',
  unverifiedDetail: 'Abrí el correo de verificación y después volvé a entrar.',
  blockedTitle: 'Cuenta bloqueada',
  blockedDetail: 'No podés iniciar sesión con esta cuenta.',
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

export function loginErrorMessage(error: unknown): LoginNotice {
  if (!(error instanceof ApiError) || error.kind === 'network' || error.kind === 'timeout' || error.status >= 500) {
    return { tone: 'error', title: AUTH_COPY.network }
  }
  switch (error.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return {
        tone: 'error',
        title: AUTH_COPY.invalidCredentialsTitle,
        detail: AUTH_COPY.invalidCredentialsDetail,
        code: error.code,
      }
    case 'AUTH_EMAIL_UNVERIFIED':
      return {
        tone: 'warning',
        title: AUTH_COPY.unverifiedTitle,
        detail: AUTH_COPY.unverifiedDetail,
        code: error.code,
      }
    case 'AUTH_ACCOUNT_BLOCKED':
      return {
        tone: 'neutral',
        title: AUTH_COPY.blockedTitle,
        detail: AUTH_COPY.blockedDetail,
        code: error.code,
      }
    case 'AUTH_ACCOUNT_UNAVAILABLE':
      return { tone: 'neutral', title: AUTH_COPY.unavailableAccount, code: error.code }
    default:
      return { tone: 'error', title: AUTH_COPY.unknownLogin }
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
