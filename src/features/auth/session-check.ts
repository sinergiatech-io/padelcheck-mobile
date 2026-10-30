/** Deadline for GET /auth/me while restoring or rechecking a session. KAN-126. */
export const SESSION_CHECK_TIMEOUT_MS = 10_000

type SessionCheckError = {
  status?: number
} | null

export type SessionCheckDecision = 'ready' | 'expired' | 'unverified' | 'ignore'

/**
 * A replaced attempt, or a check finished after the user left, must not restore access.
 * HTTP 401 retires the local session. Timeout, network and 5xx stay unverified.
 */
export function decideSessionCheck(input: {
  attempt: number
  current: number
  error?: SessionCheckError
}): SessionCheckDecision {
  if (input.attempt !== input.current) return 'ignore'
  if (input.error == null) return 'ready'
  if (input.error.status === 401) return 'expired'
  return 'unverified'
}
