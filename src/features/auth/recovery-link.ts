export type RecoveryLink = { id: number; token: string }
let sequence = 0
let pending: RecoveryLink | undefined
export function readRecoveryLink() { return pending }
export function clearRecoveryLink() { pending = undefined }
/** Expo native-intent runs before routing, for cold and warm installed-app links. */
export function redirectRecoveryLink(path: string) {
  try {
    const url = new URL(path, 'padelcheck://app')
    const route = url.protocol === 'padelcheck:' && url.hostname === 'reset-password' ? '/reset-password' : url.pathname
    if (route !== '/reset-password') return path
    const tokens = url.searchParams.getAll('token')
    pending = { id: ++sequence, token: tokens.length === 1 ? tokens[0] : '' }
    return '/reset-password?attempt=' + sequence
  } catch { return path.startsWith('/reset-password') ? '/reset-password' : path }
}
