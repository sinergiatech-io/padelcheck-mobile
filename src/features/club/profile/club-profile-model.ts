export type ImageFraming = { offsetX: number; offsetY: number; scale: number }
export type LocationDto = {
  countryCode: string
  countryName: string
  provinceId: string
  provinceName: string
  localityId: string
  localityName: string
  latitude?: number | null
  longitude?: number | null
}
export type LegacyLocation = { city?: string | null; countryDivision?: string | null; country?: string | null }
export type ClubProfile = {
  clubId: string
  name: string
  contactEmail: string
  contactPhone?: string | null
  description?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  logoUrl?: string | null
  coverPhotoUrl?: string | null
  logoFraming: ImageFraming
  coverFraming: ImageFraming
  location?: LocationDto | null
  legacyLocation?: LegacyLocation | null
  status: 'ACTIVE' | 'INACTIVE'
  active: boolean
}
export type ClubPublicProfile = {
  clubId: string
  name: string
  contactEmail?: string | null
  contactPhone?: string | null
  description?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  logoUrl?: string | null
  coverPhotoUrl?: string | null
  logoFraming?: ImageFraming | null
  coverFraming?: ImageFraming | null
  city?: string | null
  countryDivision?: string | null
  country?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  tournaments: unknown[]
}
export type DayStatus = 'UNCONFIGURED' | 'CLOSED' | 'OPEN'
export type DaySchedule = { status: DayStatus; intervals: { open: string; close: string }[] }
export type WeeklySchedule = {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}
export type SportSettings = {
  clubId: string
  defaultMatchDurationMinutes: number
  defaultRestMinutes: number
  weeklySchedule: WeeklySchedule
  partialWeek: boolean
}

export const WEEKDAYS = [
  ['monday', 'Lunes'],
  ['tuesday', 'Martes'],
  ['wednesday', 'Miércoles'],
  ['thursday', 'Jueves'],
  ['friday', 'Viernes'],
  ['saturday', 'Sábado'],
  ['sunday', 'Domingo'],
] as const

export type Weekday = typeof WEEKDAYS[number][0]

export function emptyDay(): DaySchedule {
  return { status: 'UNCONFIGURED', intervals: [] }
}

export function emptyWeek(): WeeklySchedule {
  return {
    monday: emptyDay(), tuesday: emptyDay(), wednesday: emptyDay(), thursday: emptyDay(),
    friday: emptyDay(), saturday: emptyDay(), sunday: emptyDay(),
  }
}

export function framing(value?: Partial<ImageFraming> | null): ImageFraming {
  return {
    offsetX: Number(value?.offsetX) || 0,
    offsetY: Number(value?.offsetY) || 0,
    scale: Number(value?.scale) > 0 ? Number(value?.scale) : 1,
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value : value == null ? null : String(value)
}

export function parseProfile(value: unknown): ClubProfile {
  if (!value || typeof value !== 'object') throw new Error('Invalid club profile')
  const row = value as Record<string, unknown>
  const location = row.location && typeof row.location === 'object' ? row.location as Record<string, unknown> : null
  const legacy = row.legacyLocation && typeof row.legacyLocation === 'object' ? row.legacyLocation as Record<string, unknown> : null
  return {
    clubId: String(row.clubId),
    name: String(row.name ?? ''),
    contactEmail: String(row.contactEmail ?? ''),
    contactPhone: text(row.contactPhone),
    description: text(row.description),
    instagramUrl: text(row.instagramUrl),
    facebookUrl: text(row.facebookUrl),
    logoUrl: text(row.logoUrl),
    coverPhotoUrl: text(row.coverPhotoUrl),
    logoFraming: framing(row.logoFraming as ImageFraming),
    coverFraming: framing(row.coverFraming as ImageFraming),
    location: location ? {
      countryCode: String(location.countryCode ?? 'AR'),
      countryName: String(location.countryName ?? 'Argentina'),
      provinceId: String(location.provinceId),
      provinceName: String(location.provinceName),
      localityId: String(location.localityId),
      localityName: String(location.localityName),
      latitude: location.latitude == null ? null : Number(location.latitude),
      longitude: location.longitude == null ? null : Number(location.longitude),
    } : null,
    legacyLocation: legacy ? {
      city: text(legacy.city),
      countryDivision: text(legacy.countryDivision),
      country: text(legacy.country),
    } : null,
    status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    active: Boolean(row.active),
  }
}

export function parsePublic(value: unknown): ClubPublicProfile {
  if (!value || typeof value !== 'object') throw new Error('Invalid public profile')
  const row = value as Record<string, unknown>
  return {
    clubId: String(row.clubId),
    name: String(row.name ?? ''),
    contactEmail: text(row.contactEmail),
    contactPhone: text(row.contactPhone),
    description: text(row.description),
    instagramUrl: text(row.instagramUrl),
    facebookUrl: text(row.facebookUrl),
    logoUrl: text(row.logoUrl),
    coverPhotoUrl: text(row.coverPhotoUrl),
    logoFraming: row.logoFraming ? framing(row.logoFraming as ImageFraming) : null,
    coverFraming: row.coverFraming ? framing(row.coverFraming as ImageFraming) : null,
    city: text(row.city),
    countryDivision: text(row.countryDivision),
    country: text(row.country),
    status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    tournaments: Array.isArray(row.tournaments) ? row.tournaments : [],
  }
}

function parseDay(value: unknown): DaySchedule {
  if (!value || typeof value !== 'object') return emptyDay()
  const row = value as Record<string, unknown>
  const status = row.status === 'CLOSED' || row.status === 'OPEN' ? row.status : 'UNCONFIGURED'
  const intervals = Array.isArray(row.intervals)
    ? row.intervals.map(item => {
      const interval = item as Record<string, unknown>
      return { open: String(interval.open ?? ''), close: String(interval.close ?? '') }
    })
    : []
  return { status, intervals: status === 'OPEN' ? intervals : [] }
}

export function parseSportSettings(value: unknown): SportSettings {
  if (!value || typeof value !== 'object') throw new Error('Invalid sport settings')
  const row = value as Record<string, unknown>
  const week = row.weeklySchedule && typeof row.weeklySchedule === 'object'
    ? row.weeklySchedule as Record<string, unknown>
    : {}
  const weeklySchedule: WeeklySchedule = {
    monday: parseDay(week.monday),
    tuesday: parseDay(week.tuesday),
    wednesday: parseDay(week.wednesday),
    thursday: parseDay(week.thursday),
    friday: parseDay(week.friday),
    saturday: parseDay(week.saturday),
    sunday: parseDay(week.sunday),
  }
  return {
    clubId: String(row.clubId),
    defaultMatchDurationMinutes: Number(row.defaultMatchDurationMinutes) || 90,
    defaultRestMinutes: Number(row.defaultRestMinutes) || 0,
    weeklySchedule,
    partialWeek: Boolean(row.partialWeek ?? Object.values(weeklySchedule).some(day => day.status === 'UNCONFIGURED')),
  }
}

export function daySummary(day: DaySchedule) {
  if (day.status === 'UNCONFIGURED') return 'Sin configurar'
  if (day.status === 'CLOSED') return 'Cerrado'
  return day.intervals.map(i => `${i.open}–${i.close}`).join(', ') || 'Abierto'
}

export function mediaKeyFromUrl(url: string | null | undefined) {
  if (!url) return null
  if (url.startsWith('/api/media/')) return url.slice('/api/media/'.length)
  if (url.startsWith('clubs/')) return url
  return url
}

export function absoluteMedia(url: string | null | undefined, apiBase: string) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url
  if (url.startsWith('/api/')) return `${apiBase.replace(/\/api$/, '')}${url}`
  if (url.startsWith('/')) return `${apiBase.replace(/\/api$/, '')}${url}`
  return `${apiBase}/media/${url}`
}
