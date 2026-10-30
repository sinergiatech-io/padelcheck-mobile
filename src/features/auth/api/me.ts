import { apiClient } from '@/lib/api-client'
import { SESSION_CHECK_TIMEOUT_MS } from '@/features/auth/session-check'
import type { AuthPrincipal } from '@/types/auth'

export function fetchCurrentUser() {
  return apiClient.get<AuthPrincipal>('/auth/me', { timeoutMs: SESSION_CHECK_TIMEOUT_MS })
}
