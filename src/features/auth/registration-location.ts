export type Point = { latitude: number; longitude: number }
export type Province = { id: string; name: string }
export type Locality = { id: string; name: string; provinceId: string }
export type LocationRequest = { countryCode: 'AR'; provinceId: string; localityId: string; latitude?: number; longitude?: number }
export type ResolvedLocation = LocationRequest & { provinceName: string; localityName: string }
export type Permission = 'granted' | 'prompt' | 'denied' | 'unavailable'
export type LocationProblem = 'denied' | 'unavailable' | 'outside'
export class PositionError extends Error {
  constructor(readonly reason: LocationProblem) { super(reason) }
}
export interface LocationTransport {
  get<T>(path: string, options: { signal: AbortSignal; timeoutMs: number }): Promise<T>
}
export interface PositionProvider {
  permission(): Promise<Permission>
  position(signal: AbortSignal): Promise<Point>
}
export type LocationState = {
  mode: 'choice' | 'detecting' | 'resolved' | 'manual'
  problem?: LocationProblem
  provinces: Province[]
  province: Province | null
  localities: Locality[]
  selection: ResolvedLocation | null
  provinceStatus: 'idle' | 'loading' | 'ready' | 'error'
  localityStatus: 'idle' | 'loading' | 'ready' | 'error'
  query: string
  page: number
  total: number
  errors: { province?: string; locality?: string }
}
const initialState = (): LocationState => ({ mode: 'choice', provinces: [], province: null, localities: [], selection: null,
  provinceStatus: 'idle', localityStatus: 'idle', query: '', page: 0, total: 0, errors: {} })
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export const filterProvinces = (provinces: Province[], query: string) => provinces.filter(p => normalize(p.name).includes(normalize(query.trim())))
function validPoint(point: Point) {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180
}
function rows(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== 'object' || !('items' in value) || !Array.isArray(value.items)) throw new Error('Invalid catalog')
  return value.items as Record<string, unknown>[]
}
/** In-memory only. Every async branch is cancelled/invalidated when its context changes. */
export class RegistrationLocation {
  state = initialState()
  private listeners = new Set<() => void>()
  private flights = new Map<string, AbortController>()
  private generation = 0
  private initialized = false
  constructor(private api: LocationTransport, private provider: PositionProvider) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private update(patch: Partial<LocationState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()) }
  private flight(key: string) { this.flights.get(key)?.abort(); const controller = new AbortController(); this.flights.set(key, controller); return controller }
  private current(key: string, controller: AbortController) { return !controller.signal.aborted && this.flights.get(key) === controller }
  private stopDetection() { this.generation++; this.flights.get('detect')?.abort() }
  cancel() {
    this.generation++; this.flights.forEach(f => f.abort()); this.flights.clear(); this.initialized = false
    this.update({ mode: this.state.mode === 'detecting' ? this.state.selection ? 'manual' : 'choice' : this.state.mode,
      provinceStatus: this.state.provinceStatus === 'loading' ? 'idle' : this.state.provinceStatus,
      localityStatus: this.state.localityStatus === 'loading' ? 'idle' : this.state.localityStatus })
  }
  async initialize() {
    if (this.initialized) return
    this.initialized = true
    if (this.state.mode === 'manual') { await this.manual(this.state.problem); return }
    if (this.state.mode === 'resolved') return
    const generation = this.generation
    try {
      const permission = await this.provider.permission()
      if (generation !== this.generation || this.state.mode !== 'choice') return
      if (permission === 'granted') await this.detect()
      else if (permission === 'denied' || permission === 'unavailable') await this.manual(permission)
    } catch { if (generation === this.generation) await this.manual('unavailable') }
  }
  async manual(problem?: LocationProblem) {
    this.stopDetection()
    this.update({ mode: 'manual', problem, errors: {} })
    if (this.state.provinceStatus === 'idle') await this.loadProvinces()
    if (this.state.province && this.state.localityStatus === 'idle') await this.searchLocalities('')
  }
  async detect() {
    if (this.state.mode === 'detecting') return
    const generation = ++this.generation
    const controller = this.flight('detect')
    this.update({ mode: 'detecting', problem: undefined, errors: {} })
    // A system permission request/position can outlive this timeout; it must never overwrite manual input.
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const position = await Promise.race([this.provider.position(controller.signal), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new PositionError('unavailable')), 15000)
      })])
      if (generation !== this.generation || controller.signal.aborted) return
      if (!validPoint(position)) throw new PositionError('unavailable')
      const result = await this.api.get<{ status: string; reason?: string; location?: Record<string, unknown> }>(
        `/locations/resolve?latitude=${position.latitude}&longitude=${position.longitude}`, { signal: controller.signal, timeoutMs: 12000 })
      if (generation !== this.generation || controller.signal.aborted) return
      const location = result.location
      if (result.status !== 'RESOLVED' || !location || location.countryCode !== 'AR' || typeof location.provinceId !== 'string' ||
          typeof location.provinceName !== 'string' || typeof location.localityId !== 'string' || typeof location.localityName !== 'string') {
        throw new PositionError(result.reason === 'OUTSIDE_COVERAGE' ? 'outside' : 'unavailable')
      }
      const selection: ResolvedLocation = { countryCode: 'AR', provinceId: location.provinceId, provinceName: location.provinceName,
        localityId: location.localityId, localityName: location.localityName, ...position }
      this.flights.get('localities')?.abort()
      this.update({ mode: 'resolved', selection, province: { id: selection.provinceId, name: selection.provinceName },
        localityStatus: 'idle', localities: [], query: '', problem: undefined, errors: {} })
    } catch (error) {
      if (generation === this.generation && !controller.signal.aborted) await this.manual(error instanceof PositionError ? error.reason : 'unavailable')
    } finally { if (timer) clearTimeout(timer) }
  }
  async loadProvinces() {
    const controller = this.flight('provinces')
    this.update({ provinceStatus: 'loading' })
    try {
      const response = await this.api.get<unknown>('/locations/provinces?countryCode=AR', { signal: controller.signal, timeoutMs: 12000 })
      const provinces = rows(response).map(row => {
        if (typeof row.id !== 'string' || typeof row.name !== 'string') throw new Error('Invalid province')
        return { id: row.id, name: row.name }
      })
      if (!provinces.length) throw new Error('Empty province catalog')
      if (this.current('provinces', controller)) this.update({ provinces, provinceStatus: 'ready' })
    } catch { if (this.current('provinces', controller)) this.update({ provinceStatus: 'error' }) }
  }
  async selectProvince(province: Province) {
    if (!this.state.provinces.some(p => p.id === province.id)) return
    this.stopDetection()
    this.update({ province, selection: null, localities: [], localityStatus: 'idle', query: '', total: 0, errors: {} })
    await this.searchLocalities('')
  }
  async searchLocalities(query: string, page = 0) {
    const provinceId = this.state.province?.id
    if (!provinceId) return
    const controller = this.flight('localities')
    this.update({ query, page, localityStatus: 'loading' })
    try {
      const response = await this.api.get<{ items: unknown[]; total: number }>(
        `/locations/localities?provinceId=${encodeURIComponent(provinceId)}&q=${encodeURIComponent(query)}&page=${page}&size=25`,
        { signal: controller.signal, timeoutMs: 12000 })
      const localities = rows(response).map(row => {
        if (typeof row.id !== 'string' || typeof row.name !== 'string' || row.provinceId !== provinceId) throw new Error('Invalid locality')
        return { id: row.id, name: row.name, provinceId }
      })
      if (!Number.isInteger(response.total) || response.total < 0) throw new Error('Invalid result count')
      if (this.current('localities', controller) && this.state.province?.id === provinceId)
        this.update({ localities, total: response.total, localityStatus: 'ready' })
    } catch { if (this.current('localities', controller)) this.update({ localityStatus: 'error' }) }
  }
  selectLocality(locality: Locality) {
    if (!this.state.localities.some(l => l.id === locality.id) || this.state.province?.id !== locality.provinceId) return
    this.stopDetection()
    this.update({ selection: { countryCode: 'AR', provinceId: locality.provinceId, provinceName: this.state.province.name,
      localityId: locality.id, localityName: locality.name }, problem: undefined, errors: {} })
  }
  validate() {
    if (this.state.mode === 'detecting') return false
    const errors = { ...(!this.state.province ? { province: 'Seleccioná una provincia.' } : {}),
      ...(!this.state.selection ? { locality: 'Seleccioná una localidad.' } : {}) }
    if (Object.keys(errors).length) {
      if (this.state.mode !== 'manual') void this.manual()
      this.update({ errors })
      return false
    }
    this.update({ errors: {} }); return true
  }
  request(): LocationRequest | undefined {
    if (this.state.mode === 'detecting') return undefined
    const value = this.state.selection
    if (!value) return undefined
    return { countryCode: 'AR', provinceId: value.provinceId, localityId: value.localityId,
      ...(value.latitude !== undefined && value.longitude !== undefined ? { latitude: value.latitude, longitude: value.longitude } : {}) }
  }
}
