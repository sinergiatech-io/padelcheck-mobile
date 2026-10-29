import { apiClient } from '@/lib/api-client'
import type { AuthPrincipal } from '@/types/auth'

export function fetchCurrentUser() {
  return apiClient.get<AuthPrincipal>('/auth/me')
}
