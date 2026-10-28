import { apiClient } from '@/lib/api-client'
import type { AuthPrincipal } from '@/types/auth'

export interface LoginRequestDto {
  email: string
  password: string
}

export interface LoginResponseDto {
  accessToken: string
  tokenType: string
  expiresIn: number
  context: AuthPrincipal
}

export function login(request: LoginRequestDto) {
  return apiClient.post<LoginResponseDto>('/auth/login', request)
}
