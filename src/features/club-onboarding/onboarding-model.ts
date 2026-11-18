/** Pure rules for the club registration wizard (KAN-129). No React, storage or network here. */

export type Platform = 'ANDROID' | 'IOS'
export type PlanCode = 'FREE' | 'PRO' | 'ELITE'
export type ResumeStep = 'EMAIL_VERIFICATION' | 'CLUB' | 'PLAN' | 'VENUE' | 'DONE'

export interface AccountDraft { firstName: string; lastName: string; email: string; password: string; phone: string }
export interface CatalogLocation { provinceId: string; localityId: string; provinceName: string; localityName: string }
export interface ClubLocationRequest { countryCode: 'AR'; provinceId: string; localityId: string }
export interface ResumeClub { name: string; location: CatalogLocation | null; legacyText: string | null }
export interface Resume {
  sessionId: string
  step: ResumeStep
  email: string
  firstName: string
  lastName: string
  phone: string | null
  emailVerified: boolean
  club: ResumeClub | null
  selectedPlanCode: string | null
  clubId: string | null
  subscriptionPlanCode: string | null
  subscriptionStatus: string | null
  initialSetupStatus: string | null
  paymentStatus: string | null
}

export type WizardView =
  | 'loading' | 'resumeError' | 'account' | 'emailPending' | 'verifying' | 'emailVerified'
  | 'linkInvalid' | 'verifyError' | 'sessionExpired' | 'club' | 'plan' | 'payment' | 'venue' | 'done'

/** Step number shown as "Paso N de 5". Terminal states of the session have none. */
export function stepNumber(view: WizardView): number | null {
  switch (view) {
    case 'account': return 1
    case 'emailPending': case 'verifying': case 'emailVerified': case 'linkInvalid': case 'verifyError': return 2
    case 'club': return 3
    case 'plan': case 'payment': return 4
    case 'venue': return 5
    default: return null
  }
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export type AccountErrors = Partial<Record<'firstName' | 'lastName' | 'email' | 'password', string>>
export function validateAccount(draft: AccountDraft): AccountErrors {
  const errors: AccountErrors = {}
  if (!draft.firstName.trim()) errors.firstName = 'Ingresá tu nombre.'
  if (!draft.lastName.trim()) errors.lastName = 'Ingresá tu apellido.'
  if (!EMAIL_PATTERN.test(draft.email.trim())) errors.email = 'Ingresá un email válido.'
  if (draft.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.'
  return errors
}
export const EMAIL_TAKEN = 'Este email ya está registrado. Iniciá sesión con tu cuenta.'
export const CLUB_TAKEN = 'Ya existe un club con ese nombre en esa localidad.'

export function validateClubName(name: string): string | null {
  return name.trim() ? null : 'Ingresá el nombre del club.'
}

export interface CourtDraft { key: string; name: string }
export interface VenueDraft { name: string; courts: CourtDraft[] }
export type VenueErrors = { name?: string; courts?: string; courtNames: Record<string, string> }
export function validateVenue(draft: VenueDraft): VenueErrors {
  const errors: VenueErrors = { courtNames: {} }
  if (!draft.name.trim()) errors.name = 'Ingresá el nombre de la sede.'
  if (!draft.courts.length) errors.courts = 'Agregá al menos una cancha.'
  for (const court of draft.courts) if (!court.name.trim()) errors.courtNames[court.key] = 'Ingresá el nombre de la cancha.'
  return errors
}
export function venueHasErrors(errors: VenueErrors) {
  return !!errors.name || !!errors.courts || Object.keys(errors.courtNames).length > 0
}
export function venueRequest(sessionId: string, draft: VenueDraft, location: ClubLocationRequest) {
  return {
    sessionId,
    venues: [{ name: draft.name.trim(), location }],
    courts: draft.courts.map(court => ({ name: court.name.trim(), venueIndex: 0 })),
  }
}

/**
 * Fixed copy taken from the Figma frames (1915:20942, 1984:8580, 1984:8652). The client has no public plan catalog before
 * sign-in, and the club plan panel (KAN-143) reads authenticated usage, so the wizard keeps this list. The first number is bold in the UI.
 */
export const PLAN_LINES: Record<PlanCode, string[]> = {
  FREE: ['Hasta 1 torneo activo', '24 parejas por torneo', '2 categorías', '1 usuario'],
  PRO: ['Hasta 4 torneos activos', '120 parejas por torneo', '5 categorías', '5 usuarios staff', 'Estadísticas avanzadas', 'Marca personalizada'],
  ELITE: ['Sin límites operativos', 'Soporte prioritario', 'Estadísticas avanzadas', 'Marca personalizada'],
}
export function isPaid(code: string | null | undefined): code is 'PRO' | 'ELITE' { return code === 'PRO' || code === 'ELITE' }
export const planFooter = (code: PlanCode) => isPaid(code) ? 'El plan se activa cuando se confirme el pago' : null

export type PaymentState = 'activated' | 'canceled' | 'failed' | 'pending'
export function paymentState(resume: Pick<Resume, 'selectedPlanCode' | 'subscriptionPlanCode' | 'subscriptionStatus' | 'paymentStatus'>): PaymentState {
  const selected = resume.selectedPlanCode
  if (isPaid(selected) && resume.subscriptionPlanCode === selected && resume.subscriptionStatus === 'ACTIVE') return 'activated'
  if (resume.paymentStatus === 'APPLIED') return 'activated'
  if (resume.paymentStatus === 'CANCELED') return 'canceled'
  if (resume.paymentStatus === 'FAILED' || resume.paymentStatus === 'UNAPPLIED') return 'failed'
  return 'pending'
}
export function activePlan(resume: Pick<Resume, 'subscriptionPlanCode' | 'subscriptionStatus'> | null): string {
  return resume?.subscriptionStatus === 'ACTIVE' && resume.subscriptionPlanCode ? resume.subscriptionPlanCode : 'FREE'
}

function text(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value : null }
/** Defensive parse: the wizard never trusts a field it did not check. */
export function parseResume(raw: unknown): Resume | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const sessionId = text(row.sessionId)
  const step = row.step
  if (!sessionId || !['EMAIL_VERIFICATION', 'CLUB', 'PLAN', 'VENUE', 'DONE'].includes(step as string)) return null
  let club: ResumeClub | null = null
  if (row.club && typeof row.club === 'object') {
    const source = row.club as Record<string, unknown>
    const where = source.location && typeof source.location === 'object' ? source.location as Record<string, unknown> : null
    const provinceId = text(where?.provinceId), localityId = text(where?.localityId)
    const provinceName = text(source.countryDivision), localityName = text(source.city)
    const location = where?.countryCode === 'AR' && provinceId && localityId && provinceName && localityName
      ? { provinceId, localityId, provinceName, localityName } : null
    const legacyText = location ? null : [localityName, provinceName].filter(Boolean).join(', ') || null
    club = { name: text(source.name) ?? '', location, legacyText }
  }
  return {
    sessionId, step: step as ResumeStep, email: text(row.email) ?? '', firstName: text(row.firstName) ?? '', lastName: text(row.lastName) ?? '',
    phone: text(row.phone), emailVerified: row.emailVerified === true, club,
    selectedPlanCode: text(row.selectedPlanCode), clubId: text(row.clubId), subscriptionPlanCode: text(row.subscriptionPlanCode),
    subscriptionStatus: text(row.subscriptionStatus), initialSetupStatus: text(row.initialSetupStatus), paymentStatus: text(row.paymentStatus),
  }
}

/** Where a resumed session lands. */
export function viewForResume(resume: Resume): WizardView {
  switch (resume.step) {
    case 'EMAIL_VERIFICATION': return resume.emailVerified ? 'emailVerified' : 'emailPending'
    case 'CLUB': return 'club'
    case 'PLAN': return isPaid(resume.selectedPlanCode) && resume.paymentStatus ? 'payment' : 'plan'
    case 'VENUE': return 'venue'
    case 'DONE': return 'done'
  }
}

export interface VerifyProof { sessionId: string; email: string; token: string }
/** Reads the deep-link query. Anything missing means an invalid link, never a guess. */
export function readProof(params: { sessionId?: string | string[]; email?: string | string[]; token?: string | string[] }): VerifyProof | null {
  const one = (value: string | string[] | undefined) => Array.isArray(value) ? (value.length === 1 ? value[0] : '') : value ?? ''
  const proof = { sessionId: one(params.sessionId).trim(), email: one(params.email).trim(), token: one(params.token).trim() }
  return proof.sessionId && proof.email && proof.token ? proof : null
}

export const SESSION_KEY = 'padelcheck_club_onboarding'
export interface SavedSession { sessionId: string; email: string }
/** Only the session id and email are saved. Passwords and unsaved drafts never reach storage. */
export function serializeSession(session: SavedSession): string {
  return JSON.stringify({ sessionId: session.sessionId, email: session.email })
}
export function parseSavedSession(raw: string | null): SavedSession | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw)
    const sessionId = text(value?.sessionId)
    return sessionId ? { sessionId, email: text(value?.email) ?? '' } : null
  } catch { return null }
}
