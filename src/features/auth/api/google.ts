import { apiClient } from '@/lib/api-client'
import { API_BASE } from '@/lib/constants'
import { createApiClient } from '@/lib/http-client'
import type { AuthPrincipal } from '@/types/auth'

export type AccessActivity = 'PLAYER' | 'CLUB'
type Gender = 'MALE' | 'FEMALE'

type ContinuationRequest =
  | { action: 'SEND_EMAIL_OWNERSHIP' | 'LINK_GOOGLE_ACCOUNT' }
  | { action: 'SELECT_ACTIVITY'; activity: AccessActivity; gender?: Gender; baseCategoryId?: string }
  | { action: 'COMPLETE_PLAYER_PROFILE'; gender?: Gender; baseCategoryId?: string }

type ContinuationPurpose =
  | 'SELECT_ACTIVITY'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'LINK_GOOGLE_ACCOUNT'
  | 'COMPLETE_PLAYER_PROFILE'
  | 'COMPLETE_CLUB_ONBOARDING'

type IdentityChange = 'GOOGLE_LINKED' | 'ACCOUNT_ACTIVATED'

export interface GoogleContinuation {
  token: string
  purpose: ContinuationPurpose
  expiresIn: number
  progress: {
    intent?: AccessActivity | null
    emailHint?: string | null
    givenName?: string | null
    familyName?: string | null
    hasPlayer: boolean
    hasClub: boolean
    onboardingSessionId?: string | null
    returnPath?: string | null
    gender?: Gender | null
    baseCategoryId?: string | null
    allowedActions: (ContinuationRequest['action'] | 'CONFIRM_EMAIL_OWNERSHIP' | 'RESUME_CLUB_ONBOARDING')[]
  }
}

export type GoogleAuthResponse = { identityChange?: IdentityChange | null } & (
  | {
      outcome: 'SESSION'
      accessToken: string
      tokenType: 'Bearer'
      expiresIn: number
      context: AuthPrincipal
      returnPath?: string | null
    }
  | { outcome: 'CONTINUATION'; continuation: GoogleContinuation }
)

interface ExchangeRequest {
  idToken: string
  intent?: AccessActivity
  returnPath?: string
}

const identityClient = createApiClient({ baseUrl: API_BASE, getToken: () => null })

export function exchangeGoogleIdentity(request: ExchangeRequest, platform: 'ANDROID' | 'IOS', signal?: AbortSignal) {
  return identityClient.post<GoogleAuthResponse>('/auth/google', { ...request, platform }, { signal })
}

export function resolveGoogleContinuation(token: string, request: ContinuationRequest, signal?: AbortSignal) {
  return identityClient.post<GoogleAuthResponse>('/auth/continuations/resolve', { ...request, token }, { signal })
}

export function confirmGoogleEmail(token: string, signal?: AbortSignal) {
  return identityClient.post<GoogleAuthResponse>('/auth/continuations/confirm-email', { token }, { signal })
}

type AddActivityRequest =
  | { activity: 'CLUB' }
  | { activity: 'PLAYER'; gender: Gender; baseCategoryId: string }

export function addAccountActivity(request: AddActivityRequest, signal?: AbortSignal) {
  return apiClient.post<GoogleAuthResponse>('/auth/activities', request, { signal })
}
