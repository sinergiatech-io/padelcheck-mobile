let sequence = 0

/** A return link is a navigation hint. Only the signed-in club's stored attempt is consulted. */
export function redirectPaymentReturn(path: string): string {
  try {
    const url = new URL(path, 'padelcheck://app')
    const web = url.origin === 'https://padelcheck-fe.pages.dev'
    const scheme = url.protocol === 'padelcheck:' && url.hostname === 'billing' && url.pathname === '/return'
    const relative = path.startsWith('/') && !path.startsWith('//')
    if (!(scheme || ((web || relative) && url.pathname === '/billing/return'))) return path
    return '/club/plan?paymentReturn=' + ++sequence
  } catch {
    return path
  }
}
