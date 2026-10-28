import { API_BASE } from '@/lib/constants'
import { getStoredToken } from '@/lib/auth'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const raw = (payload as { message?: unknown }).message
      if (typeof raw === 'string') message = raw
    }
    throw new ApiError(String(message), response.status, payload ?? undefined)
  }

  return payload as T
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { ...(options ?? {}), method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...(options ?? {}),
      method: 'POST',
      body: body != null ? JSON.stringify(body) : undefined,
    }),
}
