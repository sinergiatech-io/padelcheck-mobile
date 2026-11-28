export type RecoveryLink = { id: number; token: string }
let sequence = 0
let pending: RecoveryLink | undefined
let pendingRoute: string | undefined
export function readRecoveryLink(route = '/reset-password') { return route === pendingRoute ? pending : undefined }
export function clearRecoveryLink(route = '/reset-password') {
  if (route === pendingRoute) { pending = undefined; pendingRoute = undefined }
}
/** Expo native-intent runs before routing, for cold and warm installed-app links. */
export function redirectRecoveryLink(path: string) {
  try {
    const url = new URL(path, 'padelcheck://app')
    const routes = ['/reset-password', '/activate-player']
    const route = url.protocol === 'padelcheck:' && routes.includes('/' + url.hostname) ? '/' + url.hostname : url.pathname
    if (!routes.includes(route)) return path
    const tokens = url.searchParams.getAll('token')
    pending = { id: ++sequence, token: tokens.length === 1 ? tokens[0] : '' }
    pendingRoute = route
    return route + '?attempt=' + sequence
  } catch { return ['/reset-password', '/activate-player'].find(route => path.startsWith(route)) ?? path }
}
