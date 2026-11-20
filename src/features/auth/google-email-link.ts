
let pending: { attempt: string; token: string } | undefined
let next = 0

export function takeGoogleEmailLink(attempt: string | undefined) {
  return pending?.attempt === attempt ? pending?.token ?? '' : ''
}

export function clearGoogleEmailLink(attempt: string | undefined) {
  if (pending?.attempt === attempt) pending = undefined
}

export function redirectGoogleEmailLink(path: string) {
  try {
    const url = new URL(path, 'padelcheck://app')
    const route = url.protocol === 'padelcheck:' && url.hostname === 'auth'
      ? '/auth' + url.pathname : url.pathname
    if (route !== '/auth/google/verify-email') return path
    const candidates = url.searchParams.getAll('token')
    const attempt = String(++next)
    pending = { attempt, token: candidates.length === 1 ? candidates[0] : '' }
    return '/auth/google/verify-email?attempt=' + attempt
  } catch {
    return path.startsWith('/auth/google/verify-email') ? '/auth/google/verify-email' : path
  }
}
