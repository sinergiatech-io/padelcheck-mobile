import { API_BASE } from '@/lib/constants'
import { getStoredToken } from '@/lib/auth'
import { createApiClient } from './http-client'

export { ApiError } from './http-client'
export type { ErrorResponse, ApiErrorKind, ApiRequestOptions } from './http-client'

export const apiClient = createApiClient({
  baseUrl: API_BASE,
  getToken: getStoredToken,
})
