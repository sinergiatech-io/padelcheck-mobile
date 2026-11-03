export type RecoveryPlatform = 'WEB' | 'ANDROID' | 'IOS'
export type PasswordAction = 'CREATE_PASSWORD' | 'RESET_PASSWORD'
export type RecoveryStage = 'request' | 'sent' | 'inspect' | 'inspectError' | 'password' | 'invalid' | 'cleanup' | 'success'
export type RecoveryFields = { email: string; password: string; confirmPassword: string }
export type RecoveryState = {
  stage: RecoveryStage; busy: boolean; fields: RecoveryFields; errors: Partial<RecoveryFields>
  notice: string | null; passwordAction?: PasswordAction; retryAt: number
}
export interface RecoveryTransport {
  post<T>(path: string, body: unknown, options?: { signal?: AbortSignal; timeoutMs?: number; cache?: RequestCache }): Promise<T>
}
export function validateRecovery(fields: RecoveryFields, password: boolean): Partial<RecoveryFields> {
  if (!password) return !fields.email.trim() ? { email: 'El email es obligatorio' }
    : fields.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()) ? { email: 'Email inválido' } : {}
  return {
    ...(!fields.password ? { password: 'La contraseña es obligatoria' } : fields.password.length < 8 ? { password: 'Usá al menos 8 caracteres' } : {}),
    ...(!fields.confirmPassword ? { confirmPassword: 'Confirmá tu contraseña' } : fields.confirmPassword !== fields.password ? { confirmPassword: 'Las contraseñas no coinciden' } : {}),
  }
}

/** In-memory only. A new screen/link owns a new machine; old responses cannot restore it. */
export class RecoveryMachine {
  state: RecoveryState
  private proof: string
  private listeners = new Set<() => void>()
  private controller?: AbortController
  private generation = 0
  constructor(private transport: RecoveryTransport, private platform: RecoveryPlatform, token: string | undefined,
    private clearSession: () => boolean | Promise<boolean>, private now = Date.now) {
    this.proof = token ?? ''
    this.state = { stage: token === undefined ? 'request' : !token.trim() || token.length > 100 ? 'invalid' : 'inspect', busy: false,
      fields: { email: '', password: '', confirmPassword: '' }, errors: {}, notice: null, retryAt: 0 }
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  snapshot = () => this.state
  private update(patch: Partial<RecoveryState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()) }
  setField(key: keyof RecoveryFields, value: string) {
    if (this.state.busy) return
    this.update({ fields: { ...this.state.fields, [key]: value }, errors: { ...this.state.errors, [key]: undefined } })
  }
  cancel() {
    this.generation++; this.controller?.abort(); this.proof = ''
    this.update({ busy: false, fields: { email: '', password: '', confirmPassword: '' } })
  }
  async run() {
    const { stage, fields, retryAt, busy } = this.state
    if (busy || this.now() < retryAt || !['request', 'inspect', 'inspectError', 'password', 'cleanup'].includes(stage)) return
    if (stage === 'request' || stage === 'password') {
      const errors = validateRecovery(fields, stage === 'password')
      this.update({ errors })
      if (Object.keys(errors).length) return
    }
    const attempt = ++this.generation
    this.controller = new AbortController()
    this.update({ busy: true, notice: null })
    try {
      const options = { signal: this.controller.signal, timeoutMs: 15000, cache: 'no-store' as const }
      if (stage === 'request') {
        await this.transport.post('/auth/password-recovery/request', { email: fields.email.trim(), platform: this.platform }, options)
        if (attempt === this.generation) this.update({ stage: 'sent', fields: { email: '', password: '', confirmPassword: '' } })
      } else if (stage === 'inspect' || stage === 'inspectError') {
        const result = await this.transport.post<{ passwordAction?: PasswordAction }>('/auth/password-recovery/inspect', { token: this.proof }, options)
        if (attempt !== this.generation) return
        if (result?.passwordAction !== 'CREATE_PASSWORD' && result?.passwordAction !== 'RESET_PASSWORD') throw new Error('Invalid capability')
        this.update({ stage: 'password', passwordAction: result.passwordAction })
      } else {
        if (stage === 'password') {
          await this.transport.post('/auth/password-recovery/confirm', { token: this.proof, password: fields.password, confirmPassword: fields.confirmPassword }, options)
          if (attempt !== this.generation) return
          this.proof = ''
          this.update({ stage: 'cleanup', fields: { email: '', password: '', confirmPassword: '' } })
        }
        if (!(await this.clearSession())) throw new Error('Local cleanup failed')
        if (attempt === this.generation) this.update({ stage: 'success' })
      }
    } catch (error) {
      if (attempt !== this.generation) return
      const failure = error as { status?: number; code?: string; retryAfterMs?: number }
      if ((stage === 'inspect' || stage === 'inspectError' || stage === 'password') && failure.status === 400 &&
        (failure.code === 'PASSWORD_RECOVERY_INVALID_LINK' || failure.code === 'PASSWORD_RECOVERY_INVALID_INPUT' && stage !== 'password')) {
        this.proof = ''
        this.update({ stage: 'invalid', fields: { email: '', password: '', confirmPassword: '' } })
      } else {
        const limited = failure.status === 429
        const cleanup = this.state.stage === 'cleanup'
        this.update({ stage: stage === 'inspect' ? 'inspectError' : this.state.stage,
          notice: cleanup ? 'No pudimos cerrar la sesión anterior' : limited ? 'Alcanzaste el límite de intentos' :
            stage === 'request' ? 'No pudimos enviar la solicitud' : stage === 'password' ? 'No pudimos guardar tu contraseña' : 'No pudimos verificar el enlace',
          retryAt: limited ? this.now() + Math.max(0, failure.retryAfterMs ?? 0) : 0 })
      }
    } finally { if (attempt === this.generation) this.update({ busy: false }) }
  }
}
