export type Preset = 'WEEKEND' | 'WEEKDAYS' | 'FULL_RANGE' | 'CUSTOM'
export type CalendarStatus = 'COMPLETE' | 'INCOMPLETE'
export type EventStatus = keyof typeof statusLabels

export const statusLabels = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  INSCRIPTION_OPEN: 'Inscripciones abiertas',
  INSCRIPTION_CLOSED: 'Inscripciones cerradas',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
}

export const presets: { value: Preset; title: string; subtitle: string }[] = [
  { value: 'WEEKEND', title: 'Fin de semana', subtitle: 'Sábados y domingos del rango' },
  { value: 'WEEKDAYS', title: 'Entre semana', subtitle: 'Lunes a viernes del rango' },
  { value: 'FULL_RANGE', title: 'Todo el período', subtitle: 'Todos los días del rango' },
  { value: 'CUSTOM', title: 'Personalizado', subtitle: 'Completar días y franjas en escritorio' },
]

export const customNotice = 'Horarios a confirmar. El editor de calendario todavía no está disponible'

export type VenueSummary = { id: string; name: string; city: string | null; region: string | null }
export type VenueOption = { id: string; name: string; courts: { id: string; name: string }[] }
export type PlayDay = { date: string; intervals: { open: string; close: string }[] }
export type Calendar = { status: CalendarStatus; days: PlayDay[] }

export type ClubEvent = {
  id: string
  name: string
  startDate: string
  endDate: string
  venues: VenueSummary[]
  status: EventStatus
  divisionCount: number
  entryFee: number
}

export type ClubEventDetail = ClubEvent & {
  playCalendarPreset: Preset | null
  playCalendarStatus: CalendarStatus
  playCalendarDays: PlayDay[]
  courtIds: string[]
  schedulingMode?: 'AUTO' | 'MANUAL' | null
}

export type EventDraft = {
  name: string
  startDate: string
  endDate: string
  playCalendarPreset: Preset | null
  venueIds: string[]
  courtIds: string[]
}

export function eventDraft(event?: ClubEventDetail): EventDraft {
  return {
    name: event?.name ?? '',
    startDate: event?.startDate ?? '',
    endDate: event?.endDate ?? '',
    playCalendarPreset: event?.playCalendarPreset ?? null,
    venueIds: event?.venues.map(venue => venue.id) ?? [],
    courtIds: event?.courtIds ?? [],
  }
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validEventDates(draft: EventDraft) {
  return Boolean(draft.name.trim()) && draft.name.length <= 255 &&
    isDate(draft.startDate) && isDate(draft.endDate) && draft.endDate >= draft.startDate
}

export function toggleChoice(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]
}

export function toggleVenue(draft: EventDraft, venue: VenueOption): EventDraft {
  const removing = draft.venueIds.includes(venue.id)
  return {
    ...draft,
    venueIds: toggleChoice(draft.venueIds, venue.id),
    courtIds: removing ? draft.courtIds.filter(id => !venue.courts.some(court => court.id === id)) : draft.courtIds,
  }
}

export function availableInfrastructure(draft: EventDraft, options: VenueOption[]) {
  const venues = options.filter(venue => draft.venueIds.includes(venue.id))
  const courts = new Set(venues.flatMap(venue => venue.courts.map(court => court.id)))
  return { venueIds: venues.map(venue => venue.id), courtIds: draft.courtIds.filter(id => courts.has(id)) }
}

export function validInfrastructure(draft: EventDraft, options: VenueOption[]) {
  const available = availableInfrastructure(draft, options)
  return available.venueIds.length > 0 && available.venueIds.length === draft.venueIds.length &&
    available.courtIds.length > 0 && available.courtIds.length === draft.courtIds.length
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function filterEvents(events: ClubEvent[], search: string) {
  const query = normalize(search.trim())
  return events.filter(event => normalize(event.name).includes(query))
}

export function venueLocation(venues: VenueSummary[]) {
  const places = venues.map(venue => [venue.city, venue.region].filter(Boolean).join(', ')).filter(Boolean)
  return [...new Set(places)].join(' · ')
}

const formatter = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeZone: 'UTC' })
export function eventDates(start: string, end: string) {
  const first = new Date(start + 'T00:00:00Z')
  const last = new Date(end + 'T00:00:00Z')
  if (start === end) return formatter.format(first)
  if (start.slice(0, 7) === end.slice(0, 7)) return first.getUTCDate() + '–' + formatter.format(last)
  return formatter.format(first) + ' – ' + formatter.format(last)
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function eventPrice(value: number) {
  return currencyFormatter.format(value).replace(/\s/g, '')
}

export function isCancellable(status: EventStatus) {
  return status === 'DRAFT' || status === 'INSCRIPTION_OPEN'
}

export function showCalendarNotice(event: ClubEventDetail) {
  return event.playCalendarStatus === 'INCOMPLETE' &&
    (event.status === 'DRAFT' || event.status === 'PUBLISHED' || event.status === 'INSCRIPTION_OPEN')
}
