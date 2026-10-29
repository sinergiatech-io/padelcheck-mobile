let loginNotice: 'expired' | null = null

export function rememberExpiredLoginNotice(): void {
  loginNotice = 'expired'
}

export function consumeLoginNotice(): 'expired' | null {
  const notice = loginNotice
  loginNotice = null
  return notice
}
