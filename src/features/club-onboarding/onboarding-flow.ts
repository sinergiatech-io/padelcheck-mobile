import {
  EMAIL_TAKEN, CLUB_TAKEN, isPaid, paymentState, parseResume, validateAccount, validateClubName, validateVenue, venueHasErrors, venueRequest, viewForResume,
  type AccountDraft, type AccountErrors, type CatalogLocation, type ClubLocationRequest, type PaymentState, type PlanCode, type Platform, type Resume,
  type SavedSession, type VenueDraft, type VenueErrors, type VerifyProof, type WizardView,
} from './onboarding-model'

export interface OnboardingApi {
  /** Public call, never sends a bearer. */
  post<T>(path: string, body: unknown): Promise<T>
  /** Public read (resume by session id). */
  get<T>(path: string): Promise<T>
  /** Read with the signed-in bearer (resume for an administrator whose setup is pending). */
  getAuthenticated<T>(path: string): Promise<T>
}
export interface SessionStore {
  load(): Promise<SavedSession | null>
  save(session: SavedSession): Promise<void>
  clear(): Promise<void>
}
export interface OnboardingDeps { api: OnboardingApi; store: SessionStore; platform: Platform; openUrl: (url: string) => Promise<void> }

export type Busy = 'start' | 'check' | 'resend' | 'verify' | 'club' | 'plan' | 'payment' | 'venue' | 'resume'
export interface FlowState {
  view: WizardView
  sessionId: string | null
  email: string
  resume: Resume | null
  busy: Busy | null
  accountErrors: AccountErrors
  clubError: string | null
  venueErrors: VenueErrors
  /** Retryable failure of the last action. Draft data is kept by the caller. */
  notice: string | null
  resent: boolean
  /** "Ya verifiqué mi email" found no verification yet. */
  notVerified: boolean
  plan: PlanCode
  payment: PaymentState | null
  checkoutOpened: boolean
  club: { name: string; location: CatalogLocation | null; legacyText: string | null } | null
  completedPlan: string | null
}

export function initialFlowState(): FlowState {
  return {
    view: 'loading', sessionId: null, email: '', resume: null, busy: null, accountErrors: {}, clubError: null, venueErrors: { courtNames: {} },
    notice: null, resent: false, notVerified: false, plan: 'FREE', payment: null, checkoutOpened: false, club: null, completedPlan: null,
  }
}

function statusOf(error: unknown): number | undefined {
  return error && typeof error === 'object' && 'status' in error && typeof (error as { status: unknown }).status === 'number'
    ? (error as { status: number }).status : undefined
}
const isHttp = (error: unknown) => !!(error && typeof error === 'object' && (error as { kind?: string }).kind !== 'network' && (error as { kind?: string }).kind !== 'timeout')

/**
 * State machine of the wizard. One action at a time (lock), the password is only forwarded to the start request and never
 * kept, and only {sessionId,email} is persisted. The server stays the source of truth for the step.
 */
export class ClubOnboardingFlow {
  state: FlowState = initialFlowState()
  private listeners = new Set<() => void>()
  private locked = false
  private verifiedKey: string | null = null
  constructor(private deps: OnboardingDeps) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private set(patch: Partial<FlowState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()) }
  private async run(action: Busy, work: () => Promise<void>): Promise<boolean> {
    if (this.locked) return false
    this.locked = true
    this.set({ busy: action, notice: null })
    try { await work() } finally { this.locked = false; this.set({ busy: null }) }
    return true
  }
  get busy() { return this.state.busy !== null }

  private async persist(sessionId: string, email: string) {
    this.set({ sessionId, email })
    try { await this.deps.store.save({ sessionId, email }) } catch { /* resume still works through the bearer or the next link */ }
  }
  private async forget() { try { await this.deps.store.clear() } catch { /* nothing else to clean */ } }

  private applyResume(resume: Resume) {
    const view = viewForResume(resume)
    this.set({
      resume, sessionId: resume.sessionId, email: resume.email || this.state.email, view,
      club: resume.club, plan: isPaid(resume.selectedPlanCode) ? resume.selectedPlanCode : this.state.plan,
      payment: view === 'payment' ? paymentState(resume) : this.state.payment, notVerified: false, resent: false,
      completedPlan: view === 'done' ? (resume.subscriptionStatus === 'ACTIVE' && resume.subscriptionPlanCode ? resume.subscriptionPlanCode : 'FREE') : null,
    })
  }
  /** Verification was just confirmed by the server: show the verified screen before the club step. */
  private applyVerified(resume: Resume) {
    this.applyResume(resume)
    if (resume.emailVerified && (resume.step === 'EMAIL_VERIFICATION' || resume.step === 'CLUB')) this.set({ view: 'emailVerified' })
  }
  private async readResume(authenticated: boolean, sessionId: string | null): Promise<Resume> {
    const raw = authenticated
      ? await this.deps.api.getAuthenticated<unknown>('/onboarding/clubs/resume')
      : await this.deps.api.get<unknown>(`/onboarding/clubs/resume?sessionId=${encodeURIComponent(sessionId ?? '')}`)
    const resume = parseResume(raw)
    if (!resume) throw Object.assign(new Error('Invalid resume'), { kind: 'invalid-response', status: 0 })
    return resume
  }

  /** Opens `/register/club`. A bearer (administrator with pending setup) wins over the stored session id. */
  async open(hasBearer: boolean): Promise<void> {
    await this.run('resume', async () => {
      this.set({ view: 'loading' })
      let saved: SavedSession | null = null
      try { saved = await this.deps.store.load() } catch { saved = null }
      try {
        if (hasBearer) { this.applyResume(await this.readResume(true, null)); return }
        if (saved) {
          this.set({ email: saved.email })
          this.applyResume(await this.readResume(false, saved.sessionId)); return
        }
        this.set({ view: 'account' })
      } catch (error) {
        const status = statusOf(error)
        if (hasBearer && status === 401) { this.set({ view: 'sessionExpired' }); return }
        if (status === 404) {
          if (!hasBearer) await this.forget()
          this.set({ view: 'account', sessionId: null, email: '' }); return
        }
        this.set({ view: 'resumeError', notice: 'No pudimos recuperar tu registro.' })
      }
    })
  }
  /** Re-reads the server state after coming back to the app. Silent when nothing changes. */
  async refresh(hasBearer: boolean): Promise<void> {
    const { sessionId } = this.state
    if (!hasBearer && !sessionId) return
    await this.run('check', async () => {
      try { this.applyResume(await this.readResume(hasBearer, sessionId)) } catch { this.set({ notice: 'No pudimos consultar el estado.' }) }
    })
  }

  async start(draft: AccountDraft): Promise<void> {
    if (this.locked) return
    const accountErrors = validateAccount(draft)
    this.set({ accountErrors })
    if (Object.keys(accountErrors).length) return
    await this.run('start', async () => {
      const email = draft.email.trim()
      try {
        const result = await this.deps.api.post<{ sessionId: string }>('/onboarding/clubs/start', {
          email, password: draft.password, firstName: draft.firstName.trim(), lastName: draft.lastName.trim(),
          ...(draft.phone.trim() ? { phone: draft.phone.trim() } : {}), platform: this.deps.platform,
        })
        await this.persist(result.sessionId, email)
        this.set({ view: 'emailPending', resent: false, notVerified: false })
      } catch (error) {
        if (statusOf(error) === 409) this.set({ accountErrors: { email: EMAIL_TAKEN } })
        else this.set({ notice: 'No pudimos crear tu cuenta. Intentá de nuevo.' })
      }
    })
  }

  /** «Ya verifiqué mi email»: only the server decides. */
  async checkVerified(): Promise<void> {
    const { sessionId } = this.state
    if (!sessionId) return
    await this.run('check', async () => {
      try {
        const resume = await this.readResume(false, sessionId)
        if (resume.emailVerified) this.applyVerified(resume)
        else this.set({ notVerified: true, resent: false })
      } catch (error) {
        if (statusOf(error) === 404) { await this.forget(); this.set({ view: 'account', sessionId: null }) }
        else this.set({ notice: 'No pudimos comprobar tu verificación. Intentá de nuevo.' })
      }
    })
  }

  /** Resend never verifies. A session that is already verified (409) moves on after re-reading the server. */
  async resend(): Promise<void> {
    const { sessionId, email } = this.state
    if (!sessionId) return
    await this.run('resend', async () => {
      try {
        await this.deps.api.post('/onboarding/clubs/resend-email', { sessionId, email, platform: this.deps.platform })
        this.set({ view: 'emailPending', resent: true, notVerified: false })
      } catch (error) {
        const status = statusOf(error)
        if (status === 409) {
          try { this.applyVerified(await this.readResume(false, sessionId)) } catch { this.set({ notice: 'No pudimos reenviar el enlace.' }) }
        } else if (status === 404) { await this.forget(); this.set({ view: 'account', sessionId: null }) }
        else this.set({ notice: 'No pudimos reenviar el enlace. Intentá de nuevo.' })
      }
    })
  }

  /** Deep link. The same proof is verified once even if the route renders twice. */
  async verifyLink(proof: VerifyProof | null, force = false): Promise<void> {
    if (!proof) { this.set({ view: 'linkInvalid' }); return }
    const key = `${proof.sessionId}:${proof.token}`
    if (!force && this.verifiedKey === key) return
    this.verifiedKey = key
    this.set({ sessionId: proof.sessionId, email: proof.email, view: 'verifying', notice: null })
    await this.run('verify', async () => {
      try {
        await this.deps.api.post('/onboarding/clubs/verify-email', proof)
        await this.persist(proof.sessionId, proof.email)
        this.set({ view: 'emailVerified', resent: false, notVerified: false })
      } catch (error) {
        const status = statusOf(error)
        this.set({ view: isHttp(error) && [400, 404, 410].includes(status ?? 0) ? 'linkInvalid' : 'verifyError' })
      }
    })
  }
  retryVerify(proof: VerifyProof | null) { return this.verifyLink(proof, true) }

  continueFromVerified() { this.set({ view: 'club', notVerified: false }) }

  async saveClub(name: string, location: ClubLocationRequest | undefined, locationNames: { provinceName: string; localityName: string } | null): Promise<void> {
    const { sessionId } = this.state
    const nameError = validateClubName(name)
    this.set({ clubError: nameError })
    if (nameError || !location || !sessionId) return
    await this.run('club', async () => {
      try {
        await this.deps.api.post('/onboarding/clubs/tenant', { sessionId, club: { name: name.trim(), location } })
        this.set({
          view: 'plan', clubError: null,
          club: { name: name.trim(), legacyText: null, location: locationNames ? { ...location, ...locationNames } : null },
        })
      } catch (error) {
        const status = statusOf(error)
        if (status === 409) this.set({ clubError: CLUB_TAKEN })
        else if (status === 403) this.set({ view: 'emailPending', notVerified: true })
        else this.set({ notice: 'No pudimos crear tu club. Intentá de nuevo.' })
      }
    })
  }

  selectPlan(plan: PlanCode) { if (!this.locked) this.set({ plan, notice: null }) }

  /** FREE records the choice and moves on; PRO/ELITE additionally opens the provider link. */
  async continuePlan(): Promise<void> {
    const { sessionId, plan } = this.state
    if (!sessionId) return
    await this.run('plan', async () => {
      try {
        await this.deps.api.post('/onboarding/clubs/plan', { sessionId, planCode: plan })
        if (!isPaid(plan)) { this.set({ view: 'venue', payment: null, checkoutOpened: false }); return }
        const checkout = await this.deps.api.post<{ url?: string }>('/onboarding/clubs/checkout', { sessionId })
        if (!checkout?.url) throw new Error('Missing checkout url')
        this.set({ view: 'payment', payment: 'pending', checkoutOpened: true })
        try { await this.deps.openUrl(checkout.url) } catch { this.set({ notice: 'No pudimos abrir el pago. Intentá de nuevo.' }) }
      } catch (error) {
        this.set({ notice: statusOf(error) === 409 ? 'El plan ya no se puede cambiar.' : 'No pudimos continuar con el plan. Intentá de nuevo.' })
      }
    })
  }

  /** Payment screen: re-read what the provider confirmed. The client never confirms a charge. */
  async consultPayment(): Promise<void> {
    const { sessionId } = this.state
    if (!sessionId) return
    await this.run('payment', async () => {
      try {
        const resume = await this.readResume(false, sessionId)
        this.set({ resume, payment: paymentState(resume), club: resume.club ?? this.state.club })
      } catch { this.set({ notice: 'No pudimos consultar el estado del pago.' }) }
    })
  }
  continueToVenue() { this.set({ view: 'venue', notice: null }) }
  backToPlan() { this.set({ view: 'plan', notice: null }) }

  async completeVenue(draft: VenueDraft, location: ClubLocationRequest | undefined): Promise<void> {
    const { sessionId } = this.state
    const venueErrors = validateVenue(draft)
    this.set({ venueErrors })
    if (venueHasErrors(venueErrors) || !location || !sessionId) return
    await this.run('venue', async () => {
      try {
        await this.deps.api.post('/onboarding/clubs/complete', venueRequest(sessionId, draft, location))
        let completedPlan = 'FREE'
        try {
          const resume = await this.readResume(false, sessionId)
          completedPlan = resume.subscriptionStatus === 'ACTIVE' && resume.subscriptionPlanCode ? resume.subscriptionPlanCode : 'FREE'
        } catch { /* FREE is the safe label when the confirmation read fails */ }
        await this.forget()
        this.set({ view: 'done', completedPlan })
      } catch (error) {
        const status = statusOf(error)
        this.set({ notice: status === 400 ? 'Revisá los datos de la sede y las canchas.' : 'No pudimos guardar tu sede. Intentá de nuevo.' })
      }
    })
  }

  /** Link without a stored session, or one the server no longer knows: start again from the account step. */
  restart() { void this.forget(); this.verifiedKey = null; this.set({ ...initialFlowState(), view: 'account' }) }
}
