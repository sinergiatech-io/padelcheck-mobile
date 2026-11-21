export type AccessActivity = 'PLAYER' | 'CLUB'
export type InitialSetupStatus = 'COMPLETED' | 'PENDING' | 'UNKNOWN'
export type ClubStatus = 'ACTIVE' | 'INACTIVE'

export interface AccessContext {
  activity: AccessActivity
  playerId?: string | null
  clubId?: string | null
  membershipId?: string | null
  role?: string | null
  initialSetupStatus?: InitialSetupStatus | null
  clubStatus?: ClubStatus | null
  permissions?: string[] | null
}

export type ContinueReason = 'multiple-activities' | 'pending-setup' | 'unavailable'

export type AccessDestination =
  | { kind: 'player' }
  | { kind: 'club'; clubId: string }
  | { kind: 'continue'; reason: ContinueReason }

export type AccessPlatform = 'web' | 'native'

const WEB_PLAYER_ROOT = '/app/events'
const WEB_CLUB_ROOT = '/app'
const NATIVE_PLAYER_ROOT = '/events'
const NATIVE_CLUB_ROOT = '/dashboard'
const WEB_CONTINUE = '/auth/continue'
const NATIVE_CONTINUE = '/auth-continue'

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function asContext(value: unknown): AccessContext | null {
  if (!value || typeof value !== 'object') return null
  const entry = value as Record<string, unknown>
  if (entry.activity === 'PLAYER') {
    const playerId = text(entry.playerId)
    if (!playerId) return null
    return { activity: 'PLAYER', playerId }
  }
  if (entry.activity === 'CLUB') {
    const clubId = text(entry.clubId)
    if (!clubId) return null
    const status = entry.initialSetupStatus
    return {
      activity: 'CLUB',
      clubId,
      membershipId: text(entry.membershipId),
      role: text(entry.role),
      initialSetupStatus:
        status === 'COMPLETED' || status === 'PENDING' || status === 'UNKNOWN' ? status : null,
      clubStatus: entry.clubStatus === 'ACTIVE' || entry.clubStatus === 'INACTIVE' ? entry.clubStatus : null,
      permissions: Array.isArray(entry.permissions)
        ? entry.permissions.filter((item): item is string => typeof item === 'string')
        : null,
    }
  }
  return null
}

/** Destination comes only from accessContexts. Legacy profile fields are ignored. */
export function resolveAccessDestination(contexts: unknown): AccessDestination {
  if (!Array.isArray(contexts)) return { kind: 'continue', reason: 'unavailable' }
  if (contexts.length === 0) return { kind: 'continue', reason: 'unavailable' }

  const parsed = contexts.map(asContext)
  if (parsed.some((entry) => entry === null)) return { kind: 'continue', reason: 'unavailable' }
  const valid = parsed.filter((entry): entry is AccessContext => entry !== null)
  const players = valid.filter((entry) => entry.activity === 'PLAYER')
  const clubs = valid.filter((entry) => entry.activity === 'CLUB')

  if (players.length > 0 && clubs.length > 0) return { kind: 'continue', reason: 'multiple-activities' }
  if (clubs.length > 1) return { kind: 'continue', reason: 'multiple-activities' }
  if (players.length > 1) return { kind: 'continue', reason: 'unavailable' }
  if (players.length === 1) return { kind: 'player' }
  if (clubs.length === 1) {
    if (clubs[0].initialSetupStatus === 'PENDING') return { kind: 'continue', reason: 'pending-setup' }
    return { kind: 'club', clubId: clubs[0].clubId as string }
  }
  return { kind: 'continue', reason: 'unavailable' }
}

export function destinationPath(platform: AccessPlatform, destination: AccessDestination): string {
  if (destination.kind === 'continue') return platform === 'web' ? WEB_CONTINUE : NATIVE_CONTINUE
  if (destination.kind === 'player') return platform === 'web' ? WEB_PLAYER_ROOT : NATIVE_PLAYER_ROOT
  return platform === 'web' ? WEB_CLUB_ROOT : NATIVE_CLUB_ROOT
}

export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes('://')) return null
  const path = value.split('?')[0]?.split('#')[0] ?? ''
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path
}

/** Accept only the destinations that explicitly support returning after sign-in. */
export function acceptedReturnPath(
  platform: AccessPlatform,
  destination: AccessDestination,
  returnUrl: string | null | undefined,
): string {
  const fallback = destinationPath(platform, destination)
  if (destination.kind === 'continue') return fallback
  const path = safeInternalPath(returnUrl)
  if (platform === 'web' && destination.kind === 'player' && path === WEB_PLAYER_ROOT) return path
  if (platform === 'web' && destination.kind === 'club' && path === WEB_CLUB_ROOT) return path
  if (platform === 'native' && destination.kind === 'player' && path === NATIVE_PLAYER_ROOT) return path
  if (platform === 'native' && destination.kind === 'club' && (path === NATIVE_CLUB_ROOT || path === '/club/plan')) return path
  return fallback
}

function isPlayerArea(platform: AccessPlatform, pathname: string): boolean {
  if (platform === 'web') {
    return (
      pathname === WEB_PLAYER_ROOT ||
      pathname.startsWith(`${WEB_PLAYER_ROOT}/`) ||
      pathname === '/app/my-tournaments' ||
      pathname.startsWith('/app/my-tournaments/') ||
      pathname === '/app/players' ||
      pathname.startsWith('/app/players/') ||
      pathname === '/app/settings'
    )
  }
  return (
    pathname === NATIVE_PLAYER_ROOT ||
    pathname.startsWith(`${NATIVE_PLAYER_ROOT}/`) ||
    pathname === '/my-tournaments' ||
    pathname === '/players' ||
    pathname === '/settings' ||
    /^\/profile-settings\/(?:edit|security|password)$/.test(pathname) ||
    /^\/player\/[\w-]+(?:\/history(?:\/[\w-]+\/[\w-]+\/results)?)?$/.test(pathname)
  )
}

export function guardRedirect(
  platform: AccessPlatform,
  destination: AccessDestination,
  pathname: string,
): string | null {
  const path = safeInternalPath(pathname) ?? pathname
  if (destination.kind === 'continue') {
    const target = destinationPath(platform, destination)
    return path === target ? null : target
  }
  if (destination.kind === 'player') {
    return isPlayerArea(platform, path) ? null : destinationPath(platform, destination)
  }
  const clubRoot = platform === 'web' ? WEB_CLUB_ROOT : NATIVE_CLUB_ROOT
  const clubSettings = path === '/club/settings' || path === '/club/settings/categories'
    || path === '/club/settings/info' || path === '/club/settings/info/preview'
    || path === '/club/settings/tournaments'
    || path === '/club/settings/venues' || path.startsWith('/club/settings/venues/')
    || path === '/club/plan' || path.startsWith('/club/plan/')
  const clubPlayer = /^\/club\/players\/[\w-]+$/.test(path)
  return path === clubRoot || clubSettings || clubPlayer || platform === 'native' && path === '/club' ? null : clubRoot
}

export interface AccessChoice {
  key: string
  activity: AccessActivity
  destination: AccessDestination
}

export function accessChoices(contexts: unknown): AccessChoice[] {
  if (!Array.isArray(contexts)) return []
  const valid = contexts.map(asContext)
  if (valid.some(entry => entry === null)) return []
  return valid.flatMap((entry): AccessChoice[] => {
    if (!entry) return []
    if (entry.activity === 'PLAYER' && entry.playerId) {
      return [{ key: 'PLAYER:' + entry.playerId, activity: 'PLAYER', destination: { kind: 'player' } }]
    }
    if (!entry.clubId) return []
    return [{
      key: 'CLUB:' + entry.clubId + ':' + (entry.membershipId ?? ''),
      activity: 'CLUB',
      destination: entry.initialSetupStatus === 'PENDING'
        ? { kind: 'continue', reason: 'pending-setup' }
        : { kind: 'club', clubId: entry.clubId },
    }]
  })
}

function registeredPath(platform: AccessPlatform, candidate: string) {
  if (platform === 'web') {
    if (/^\/app\/events\/[\w-]+(?:\/categories\/[\w-]+(?:\/(?:enroll|inscripciones|clasificatoria|cuadros|resultados))?)?$/.test(candidate)) return true
    return ['/app/events', '/app/events/location', '/app', '/app/my-tournaments', '/club/plan',
      '/club/settings', '/club/settings/info', '/club/settings/info/preview', '/club/settings/tournaments',
      '/club/settings/categories', '/club/settings/venues'].includes(candidate)
  }
  if (/^\/events\/[\w-]+(?:\/categories\/[\w-]+(?:\/(?:enroll|inscripciones|clasificatoria|cuadros|resultados))?)?$/.test(candidate)) return true
  if (/^\/(?:player\/[\w-]+(?:\/history(?:\/[\w-]+\/[\w-]+\/results)?)?|profile-settings\/(?:edit|security|password))$/.test(candidate)) return true
  return ['/events', '/dashboard', '/my-tournaments', '/players', '/settings', '/club', '/club/plan',
    '/club/settings', '/club/settings/info', '/club/settings/tournaments', '/club/settings/categories',
    '/club/settings/venues'].includes(candidate)
}

export function accountEntry(
  platform: AccessPlatform,
  contexts: unknown,
  value: string | null | undefined,
  savedKey: string | null,
) {
  const path = safeInternalPath(value)
  const choices = accessChoices(contexts)
  const requested = path && registeredPath(platform, path)
    ? choices.filter(item => item.destination.kind !== 'continue'
      && guardRedirect(platform, item.destination, path) === null)
    : []
  if (path && requested.length === 1) return { choice: requested[0], path }
  const choice = choices.find(item => item.key === savedKey)
  const destination = choice?.destination ?? resolveAccessDestination(contexts)
  return { choice, path: destinationPath(platform, destination) }
}
