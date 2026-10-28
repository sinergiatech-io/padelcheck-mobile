export interface ClubMembershipSummary {
  membershipId: string
  clubId: string
  role: string
}

export interface ActiveClubSummary {
  clubId: string
  name: string
}

/** Matches backend AuthContextResponse (login + /auth/me). */
export interface AuthPrincipal {
  userId: string
  email: string
  firstName: string
  lastName: string
  platformRole: string
  hasPlayerProfile: boolean
  playerId: string | null
  clubMemberships: ClubMembershipSummary[]
  activeClub: ActiveClubSummary | null
}

export function displayName(p: AuthPrincipal | null | undefined): string {
  if (!p) return ''
  const n = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()
  return n || p.email
}

export interface Club {
  id: string
  name: string
  slug?: string
}
