/** Normalize a server URL to exactly one /api suffix. Only local web may use the Vite proxy. */
export function resolveApiBase(raw: string | undefined, allowLocalFallback: boolean, localBase: string): string {
  const value = raw?.trim() || (allowLocalFallback ? localBase : '')
  if (!value) throw new Error('Set the public API base URL for this environment')
  if (value === '/api' && allowLocalFallback) return value
  let url: URL
  try { url = new URL(value) } catch { throw new Error('API base URL must be an absolute HTTP(S) URL') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('API base URL must use HTTP(S), without credentials, query or fragment')
  }
  const path = url.pathname.replace(/\/+$/, '')
  if (path !== '' && path !== '/api') throw new Error('API base URL must contain only the host and optional /api')
  return `${url.origin}/api`
}

export function isLocalEnvironment(environment: string | undefined, development: boolean): boolean {
  if (environment && !['local', 'validation', 'production'].includes(environment)) {
    throw new Error('App environment must be local, validation or production')
  }
  return development && (!environment || environment === 'local')
}
