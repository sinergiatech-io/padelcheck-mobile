/** Backend ErrorResponse. Nullable Jackson fields may be omitted; details is not a server field. */
export interface ErrorResponse {
  timestamp?: string
  status: number
  error?: string
  message?: string
  code?: string
  path?: string
}

export type ApiErrorKind = 'http' | 'network' | 'cancelled' | 'timeout' | 'invalid-response'

export class ApiError extends Error {
  readonly code?: string

  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
    readonly kind: ApiErrorKind = 'http',
  ) {
    super(message)
    this.name = 'ApiError'
    if (details && typeof details === 'object' && 'code' in details && typeof details.code === 'string') {
      this.code = details.code
    }
  }
}

export interface ApiRequestOptions extends RequestInit {
  /** Optional transport deadline in milliseconds; no global/product timeout. */
  timeoutMs?: number
}

interface ClientConfig {
  baseUrl: string
  getToken: () => string | null | Promise<string | null>
  credentials?: RequestCredentials
}

type HttpErrorListener = (error: ApiError) => void

let httpErrorListener: HttpErrorListener | null = null

/** Reports transport failures. Session policy stays in the auth layer. */
export function setHttpErrorListener(listener: HttpErrorListener | null): void {
  httpErrorListener = listener
}

function notifyHttpError(error: ApiError): void {
  httpErrorListener?.(error)
}

export function createApiClient({ baseUrl, getToken, credentials }: ClientConfig) {
  async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { timeoutMs, signal, ...init } = options
    if (timeoutMs !== undefined && (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647)) {
      throw new RangeError('timeoutMs must be a positive finite timer duration')
    }
    // Never send the stored bearer to a caller-supplied host.
    if (!path.startsWith('/') || path.startsWith('//') || /[\\#]/.test(path)) {
      throw new TypeError('Use an API-relative path starting with /')
    }
    const token = await getToken()
    const headers = new Headers(init.headers)
    if (init.body != null && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const controller = new AbortController()
    let timedOut = false
    const cancel = () => controller.abort()
    if (signal?.aborted) cancel()
    else signal?.addEventListener('abort', cancel, { once: true })
    const timer = timeoutMs === undefined ? undefined : setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
    let response: Response | undefined
    try {
      if (controller.signal.aborted) throw new Error('Cancelled')
      response = await fetch(`${baseUrl}${path}`, { ...init, headers, credentials: credentials ?? init.credentials, signal: controller.signal })
      const raw = await response.text()
      let payload: unknown = raw || undefined
      const json = response.headers.get('content-type')?.toLowerCase().includes('json')
      if (raw.trim() && json) {
        try {
          payload = JSON.parse(raw)
        } catch {
          if (response.ok) {
            const invalid = new ApiError('Invalid JSON response', response.status, raw, 'invalid-response')
            notifyHttpError(invalid)
            throw invalid
          }
          // Preserve malformed error bodies just like text/HTML gateway errors.
        }
      } else if (!raw.trim()) {
        payload = undefined
      }
      if (!response.ok) {
        let message = `Request failed with status ${response.status}`
        if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
          message = payload.message
        }
        const httpError = new ApiError(message, response.status, payload)
        notifyHttpError(httpError)
        throw httpError
      }
      return payload as T
    } catch (error) {
      if (error instanceof ApiError) throw error
      const transport = new ApiError(
        controller.signal.aborted
          ? timedOut
            ? 'Request timed out'
            : 'Request cancelled'
          : 'Network request failed',
        response?.status ?? 0,
        undefined,
        controller.signal.aborted ? (timedOut ? 'timeout' : 'cancelled') : 'network',
      )
      notifyHttpError(transport)
      throw transport
    } finally {
      if (timer !== undefined) clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
    }
  }

  function write<T>(method: string, path: string, body?: unknown, options?: ApiRequestOptions) {
    return request<T>(path, { ...options, method, body: body != null ? JSON.stringify(body) : undefined })
  }

  return {
    get: <T>(path: string, options?: ApiRequestOptions) => request<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) => write<T>('POST', path, body, options),
    put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) => write<T>('PUT', path, body, options),
    patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) => write<T>('PATCH', path, body, options),
    delete: <T = void>(path: string, options?: ApiRequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
  }
}
