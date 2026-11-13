/** Platform-independent infrastructure state. No persistence, GPS or optimistic writes. */
export type Status = 'ACTIVE' | 'INACTIVE'
export type Point = { latitude: number; longitude: number }
export type Province = { id: string; name: string; latitude: number; longitude: number }
export type Locality = Province & { provinceId: string }
export type Location = Point & {
  countryCode: 'AR'; provinceId: string; provinceName: string; localityId: string; localityName: string
  pointSource: 'ADMIN_CONFIRMED' | 'LOCALITY_ONLY' | 'LOCALITY_REPRESENTATIVE' | 'DEVICE_REPORTED'
}
export type VenueLocation = Omit<Location, keyof Point> & { latitude: number | null; longitude: number | null }
export type Court = { id: string; venueId: string; name: string; status: Status; usable: boolean }
export type Venue = { id: string; clubId: string; name: string; address: string | null; city: string | null; countryDivision: string | null; country: string | null; status: Status; location: VenueLocation | null; courtCount: number; activeCourtCount: number; courts: Court[] }
export type Options = { signal: AbortSignal; timeoutMs: number }
export interface Transport { get<T>(path: string, options?: Options): Promise<T>; post<T>(path: string, body: unknown, options?: Options): Promise<T>; patch<T>(path: string, body: unknown, options?: Options): Promise<T> }
const TIMEOUT = 15000
const encode = encodeURIComponent
export const pointValid = (point: Point) => Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180
export const catalogMatch = (name: string, query: string) => {
  const fold = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es')
  return fold(name).includes(fold(query))
}
const record = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid response'); return v as Record<string, unknown> }
const string = (v: unknown) => { if (typeof v !== 'string') throw new Error('Invalid string'); return v }
const status = (v: unknown): Status => { if (v !== 'ACTIVE' && v !== 'INACTIVE') throw new Error('Invalid status'); return v }
const nullable = (v: unknown) => v == null ? null : string(v)
export function parseCourt(v: unknown, venueId: string): Court {
  const r = record(v); if (r.venueId !== venueId || typeof r.usable !== 'boolean') throw new Error('Invalid court context')
  return { id: string(r.id), venueId, name: string(r.name), status: status(r.status), usable: r.usable }
}
export function parseLocation(v: unknown): VenueLocation | null {
  if (v == null) return null
  const r = record(v)
  if (r.countryCode !== 'AR' || !['ADMIN_CONFIRMED', 'LOCALITY_ONLY', 'LOCALITY_REPRESENTATIVE', 'DEVICE_REPORTED'].includes(String(r.pointSource))) throw new Error('Invalid location')
  const latitude = r.latitude == null ? null : Number(r.latitude), longitude = r.longitude == null ? null : Number(r.longitude)
  if ((latitude === null) !== (longitude === null) || latitude !== null && !pointValid({ latitude, longitude: longitude! })) throw new Error('Invalid point')
  return { countryCode: 'AR', provinceId: string(r.provinceId), provinceName: string(r.provinceName), localityId: string(r.localityId), localityName: string(r.localityName), latitude, longitude, pointSource: r.pointSource as VenueLocation['pointSource'] }
}
export function parseVenue(v: unknown, clubId: string): Venue {
  const r = record(v); if (r.clubId !== clubId || !Array.isArray(r.courts)) throw new Error('Invalid venue context')
  const id = string(r.id), courts = r.courts.map(c => parseCourt(c, id))
  return { id, clubId, name: string(r.name), address: nullable(r.address), city: nullable(r.city), countryDivision: nullable(r.countryDivision), country: nullable(r.country), status: status(r.status), location: parseLocation(r.location), courtCount: courts.length, activeCourtCount: courts.filter(c => c.status === 'ACTIVE').length, courts }
}
export function failureCode(error: unknown) { return error instanceof Error ? error.message : '' }
export const failureCopy = (error: unknown) => ({
  VENUE_HAS_PENDING_MATCHES: 'La sede tiene partidos pendientes o en curso. Reprogramalos o resolvelos antes de desactivarla.',
  COURT_HAS_PENDING_MATCHES: 'La cancha tiene partidos pendientes o en curso. Reprogramalos o resolvelos antes de desactivarla.',
  PARENT_VENUE_INACTIVE: 'Primero reactivá la sede para poder reactivar esta cancha.',
}[failureCode(error)] ?? 'No pudimos guardar los cambios. Conservamos tus datos para que puedas reintentar.')

class Observable<S> {
  private listeners = new Set<() => void>()
  protected disposed = false
  constructor(public state: S) {}
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  snapshot = () => this.state
  protected update(patch: Partial<S>) { if (!this.disposed) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()) } }
}
export type InfrastructureState = { venues: Venue[]; loading: boolean; refreshing: boolean; saving: boolean; error: boolean; loaded: boolean; notice: string | null }
export class Infrastructure extends Observable<InfrastructureState> {
  private read?: AbortController
  private write?: AbortController
  private generation = 0
  constructor(private api: Transport, readonly clubId: string) { super({ venues: [], loading: true, refreshing: false, saving: false, error: false, loaded: false, notice: null }) }
  get path() { return `/clubs/${encode(this.clubId)}/venues` }
  async load(refresh = false) {
    if (this.state.saving || this.read && !this.read.signal.aborted) return
    this.disposed = false
    const generation = this.generation, controller = new AbortController(); this.read = controller
    this.update({ loading: !refresh && !this.state.loaded, refreshing: refresh, error: false })
    try {
      const value = await this.api.get<unknown>(this.path, { signal: controller.signal, timeoutMs: TIMEOUT })
      if (!Array.isArray(value)) throw new Error('Invalid list')
      const venues = value.map(v => parseVenue(v, this.clubId))
      if (!controller.signal.aborted && generation === this.generation) this.update({ venues, loaded: true })
    } catch { if (!controller.signal.aborted && generation === this.generation) this.update({ error: true }) }
    finally { if (generation === this.generation && !controller.signal.aborted) { this.update({ loading: false, refreshing: false }); this.read = undefined } }
  }
  cancel() { this.read?.abort(); this.write?.abort(); this.read = undefined; this.generation++; this.disposed = true }
  private async mutate<T>(operation: (options: Options) => Promise<T>, receive: (v: T) => void) {
    if (this.state.saving) throw new Error('Already saving')
    // A refresh started before this write must never replace its persisted result.
    this.read?.abort(); this.read = undefined; this.generation++
    const generation = this.generation, controller = new AbortController(); this.write = controller
    this.update({ saving: true, refreshing: false, loading: false, notice: null })
    try {
      const result = await operation({ signal: controller.signal, timeoutMs: TIMEOUT })
      if (controller.signal.aborted || generation !== this.generation) throw new Error('Cancelled')
      receive(result)
      return result
    } finally { if (!controller.signal.aborted && generation === this.generation) this.update({ saving: false }) }
  }
  private receiveVenue(value: unknown) {
    const venue = parseVenue(value, this.clubId), exists = this.state.venues.some(v => v.id === venue.id)
    this.update({ venues: exists ? this.state.venues.map(v => v.id === venue.id ? venue : v) : [...this.state.venues, venue], notice: 'Los cambios se guardaron correctamente.' })
    return venue
  }
  async saveVenue(id: string | null, body: VenueWrite) {
    let saved!: Venue
    await this.mutate(o => id ? this.api.patch<unknown>(`${this.path}/${encode(id)}`, body, o) : this.api.post<unknown>(this.path, body, o), r => { saved = this.receiveVenue(r) })
    return saved
  }
  async setVenueStatus(id: string, active: boolean, confirmLast: boolean) {
    await this.mutate(o => this.api.patch(`${this.path}/${encode(id)}/status`, { active, confirmLast }, o), r => { this.receiveVenue(r) })
  }
  private receiveCourt(venueId: string, value: unknown) {
    const court = parseCourt(value, venueId)
    const venues = this.state.venues.map(v => {
      if (v.id !== venueId) return v
      const courts = v.courts.some(c => c.id === court.id) ? v.courts.map(c => c.id === court.id ? court : c) : [...v.courts, court]
      return { ...v, courts, courtCount: courts.length, activeCourtCount: courts.filter(c => c.status === 'ACTIVE').length }
    })
    this.update({ venues, notice: 'Los cambios se guardaron correctamente.' })
    return court
  }
  async saveCourt(venueId: string, courtId: string | null, name: string) {
    if (!name.trim() || name.trim().length > 100) throw new Error('Invalid court name')
    const path = `${this.path}/${encode(venueId)}/courts`
    await this.mutate(o => courtId ? this.api.patch(`${path}/${encode(courtId)}`, { name: name.trim() }, o) : this.api.post(path, { name: name.trim() }, o), r => { this.receiveCourt(venueId, r) })
  }
  async setCourtStatus(venueId: string, courtId: string, active: boolean, confirmLast: boolean) {
    await this.mutate(o => this.api.patch(`${this.path}/${encode(venueId)}/courts/${encode(courtId)}/status`, { active, confirmLast }, o), r => { this.receiveCourt(venueId, r) })
  }
  lastVenue(venueId: string) {
    const active = this.state.venues.filter(v => v.status === 'ACTIVE')
    return active.length <= 1 || active.some(v => v.id === venueId && v.activeCourtCount > 0) && active.every(v => v.id === venueId || v.activeCourtCount === 0)
  }
  lastCourt() { return this.state.venues.filter(v => v.status === 'ACTIVE').reduce((n, v) => n + v.activeCourtCount, 0) <= 1 }
}

export type ConfirmedPoint = Point & { address: string; localityId: string }
export type VenueWrite = { name: string; address: string; location: { countryCode: 'AR'; provinceId: string; localityId: string; latitude?: number; longitude?: number; coordinatesConfirmed?: boolean }; pointConfirmedForAddress?: string; pointConfirmedForLocalityId?: string }
export type VenueDraftState = {
  name: string; address: string; province: Province | null; locality: Locality | null; point: ConfirmedPoint | null
  provinces: Province[]; localities: Locality[]; provinceStatus: 'idle' | 'loading' | 'ready' | 'error'; localityStatus: 'idle' | 'loading' | 'ready' | 'error'
  query: string; page: number; total: number; errors: { name?: string; address?: string; province?: string; locality?: string }
}
export class VenueDraft extends Observable<VenueDraftState> {
  private flights = new Map<string, AbortController>()
  readonly initial: string
  constructor(private api: Transport, readonly original: Venue | null, club: VenueLocation | null) {
    const location = original ? original.location : club
    const province = location ? { id: location.provinceId, name: location.provinceName, latitude: 0, longitude: 0 } : null
    const locality = location ? { id: location.localityId, name: location.localityName, provinceId: location.provinceId, latitude: location.pointSource === 'LOCALITY_REPRESENTATIVE' ? location.latitude ?? NaN : NaN, longitude: location.pointSource === 'LOCALITY_REPRESENTATIVE' ? location.longitude ?? NaN : NaN } : null
    const point = original?.location?.pointSource === 'ADMIN_CONFIRMED' && original.location.latitude !== null && original.location.longitude !== null
      ? { latitude: original.location.latitude, longitude: original.location.longitude, address: original.address ?? '', localityId: original.location.localityId } : null
    super({ name: original?.name ?? '', address: original?.address ?? '', province, locality, point, provinces: [], localities: [], provinceStatus: 'idle', localityStatus: 'idle', query: '', page: 0, total: 0, errors: {} })
    this.initial = this.fingerprint()
  }
  private fingerprint() { const { name, address, province, locality, point } = this.state; return JSON.stringify({ name, address, province: province?.id, locality: locality?.id, point }) }
  get dirty() { return this.fingerprint() !== this.initial }
  get validPoint() { const { point, address, locality } = this.state; return point && point.address === address.trim() && point.localityId === locality?.id ? point : null }
  get stalePoint() { return Boolean(this.state.point && !this.validPoint) }
  field(key: 'name' | 'address', value: string) { this.update({ [key]: value, errors: { ...this.state.errors, [key]: undefined } }) }
  cancel() { this.flights.forEach(c => c.abort()); this.flights.clear(); this.disposed = true }
  private begin(key: string) { this.disposed = false; this.flights.get(key)?.abort(); const c = new AbortController(); this.flights.set(key, c); return c }
  private current(key: string, c: AbortController) { return !c.signal.aborted && this.flights.get(key) === c }
  async provinces() {
    const c = this.begin('provinces'); this.update({ provinceStatus: 'loading' })
    try {
      const result = record(await this.api.get('/locations/provinces?countryCode=AR', { signal: c.signal, timeoutMs: TIMEOUT }))
      if (!Array.isArray(result.items)) throw new Error('Invalid provinces')
      const provinces = result.items.map(v => { const r = record(v); return { id: string(r.id), name: string(r.name), latitude: Number(r.latitude), longitude: Number(r.longitude) } })
      if (this.current('provinces', c)) this.update({ provinces, provinceStatus: 'ready', province: provinces.find(p => p.id === this.state.province?.id) ?? this.state.province })
    } catch { if (this.current('provinces', c)) this.update({ provinceStatus: 'error' }) }
  }
  async selectProvince(province: Province) {
    if (province.id === this.state.province?.id) return
    this.flights.get('localities')?.abort()
    this.update({ province, locality: null, localities: [], query: '', page: 0, total: 0, errors: { ...this.state.errors, province: undefined, locality: undefined } })
    await this.localities('', false)
  }
  selectLocality(locality: Locality) { if (locality.provinceId === this.state.province?.id) this.update({ locality, errors: { ...this.state.errors, locality: undefined } }) }
  async localities(query = this.state.query, append = false) {
    const provinceId = this.state.province?.id; if (!provinceId) return
    const page = append ? this.state.page + 1 : 0
    const c = this.begin('localities'); this.update({ localityStatus: 'loading', query })
    try {
      const result = record(await this.api.get(`/locations/localities?provinceId=${encode(provinceId)}&q=${encode(query)}&page=${page}&size=50`, { signal: c.signal, timeoutMs: TIMEOUT }))
      if (!Array.isArray(result.items) || typeof result.total !== 'number') throw new Error('Invalid localities')
      const items = result.items.map(v => { const r = record(v); if (r.provinceId !== provinceId) throw new Error('Invalid province context'); return { id: string(r.id), name: string(r.name), provinceId, latitude: Number(r.latitude), longitude: Number(r.longitude) } })
      if (this.current('localities', c) && this.state.province?.id === provinceId) {
        const localities = append ? [...this.state.localities, ...items] : items
        this.update({ localities, total: result.total, page, localityStatus: 'ready', locality: items.find(l => l.id === this.state.locality?.id) ?? this.state.locality })
      }
    } catch { if (this.current('localities', c)) this.update({ localityStatus: 'error' }) }
  }
  async initialize() {
    await this.provinces()
    if (!this.disposed && this.state.province) {
      // The saved locality may be outside the first page. Fetch its real centroid before opening a map.
      await this.localities(this.state.locality?.name ?? '')
    }
  }
  confirmPoint(point: Point) {
    if (!pointValid(point) || !this.state.locality) return
    this.update({ point: { ...point, address: this.state.address.trim(), localityId: this.state.locality.id } })
  }
  removePoint() { this.update({ point: null }) }
  validate() {
    const errors: VenueDraftState['errors'] = {}
    if (!this.state.name.trim() || this.state.name.trim().length > 255) errors.name = 'Ingresá el nombre de la sede.'
    if (!this.state.address.trim() || this.state.address.trim().length > 500) errors.address = 'Ingresá la dirección de la sede.'
    if (!this.state.province) errors.province = 'Seleccioná una provincia.'
    if (!this.state.locality || this.state.locality.provinceId !== this.state.province?.id) errors.locality = 'Seleccioná una localidad.'
    this.update({ errors }); return Object.keys(errors).length === 0
  }
  request(): VenueWrite {
    if (!this.validate() || !this.state.locality || !this.state.province) throw new Error('Invalid venue')
    const point = this.validPoint
    return { name: this.state.name.trim(), address: this.state.address.trim(), location: { countryCode: 'AR', provinceId: this.state.province.id, localityId: this.state.locality.id, ...(point ? { latitude: point.latitude, longitude: point.longitude, coordinatesConfirmed: true } : {}) }, ...(point ? { pointConfirmedForAddress: point.address, pointConfirmedForLocalityId: point.localityId } : {}) }
  }
}
