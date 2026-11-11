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
  mode: 'form' | 'detecting'
  problem?: LocationProblem
  provinces: Province[]
  province: Province | null
  localities: Locality[]
  selection: ResolvedLocation | null
  provinceStatus: 'idle' | 'loading' | 'ready' | 'error'
  localityStatus: 'idle' | 'loading' | 'ready' | 'error'
  errors: { province?: string; locality?: string }
}
const initialState = (): LocationState => ({
  mode: 'form', provinces: [], province: null, localities: [], selection: null,
  provinceStatus: 'idle', localityStatus: 'idle', errors: {},
})
const PAGE_SIZE = 100
function validPoint(point: Point) {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180
}
function rows(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== 'object' || !('items' in value) || !Array.isArray(value.items)) throw new Error('Invalid catalog')
  return value.items as Record<string, unknown>[]
}
/** In-memory only. A failed or dismissed permission is never requested again in the same visit. */
export class RegistrationLocation {
  state = initialState()
  private listeners = new Set<() => void>()
  private flights = new Map<string, AbortController>()
  private generation = 0
  private initialized = false
  private asked = false
  constructor(private api: LocationTransport, private provider: PositionProvider) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private update(patch: Partial<LocationState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()) }
  private flight(key: string) { this.flights.get(key)?.abort(); const controller = new AbortController(); this.flights.set(key, controller); return controller }
  private current(key: string, controller: AbortController) { return !controller.signal.aborted && this.flights.get(key) === controller }
  private stopDetection() { this.generation++; this.flights.get('detect')?.abort() }
  cancel() {
    this.generation++; this.flights.forEach(flight => flight.abort()); this.flights.clear(); this.initialized = false; this.asked = false
    this.update({
      mode: 'form',
      provinceStatus: this.state.provinceStatus === 'loading' ? 'idle' : this.state.provinceStatus,
      localityStatus: this.state.localityStatus === 'loading' ? 'idle' : this.state.localityStatus,
    })
  }
  async initialize() {
    if (this.initialized) return
    this.initialized = true
    const generation = this.generation
    const work: Promise<unknown>[] = []
    if (this.state.provinceStatus === 'idle') work.push(this.loadProvinces())
    if (this.state.province && this.state.localityStatus === 'idle') work.push(this.loadLocalities())
    let permission: Permission = 'unavailable'
    try { permission = await this.provider.permission() } catch { permission = 'unavailable' }
    if (generation !== this.generation) return
    if (permission === 'denied' || permission === 'unavailable' || this.state.province || this.state.selection) {
      this.asked = true
      this.update({ mode: 'form', ...(permission === 'denied' || permission === 'unavailable' ? { problem: permission } : {}) })
      await Promise.all(work)
      return
    }
    await Promise.all([...work, this.detect()])
  }
  async detect() {
    if (this.asked || this.state.mode === 'detecting') return
    this.asked = true
    const generation = ++this.generation
    const controller = this.flight('detect')
    this.update({ mode: 'detecting' })
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const position = await Promise.race([this.provider.position(controller.signal), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new PositionError('unavailable')), 15000)
      })])
      if (generation !== this.generation || controller.signal.aborted) return
      if (!validPoint(position)) throw new PositionError('unavailable')
      const result = await this.api.get<{ status: string; reason?: string; location?: Record<string, unknown> }>(
        `/locations/resolve?latitude=${position.latitude}&longitude=${position.longitude}`, { signal: controller.signal, timeoutMs: 12000 })
      if (generation !== this.generation || controller.signal.aborted || this.state.province || this.state.selection) {
        if (generation === this.generation && !controller.signal.aborted) this.update({ mode: 'form' })
        return
      }
      const location = result.location
      if (result.status !== 'RESOLVED' || !location || location.countryCode !== 'AR' || typeof location.provinceId !== 'string' ||
          typeof location.provinceName !== 'string' || typeof location.localityId !== 'string' || typeof location.localityName !== 'string') {
        throw new PositionError(result.reason === 'OUTSIDE_COVERAGE' ? 'outside' : 'unavailable')
      }
      const province = { id: location.provinceId, name: location.provinceName }
      const selection: ResolvedLocation = {
        countryCode: 'AR', provinceId: province.id, provinceName: province.name,
        localityId: location.localityId, localityName: location.localityName, ...position,
      }
      this.update({
        mode: 'form', problem: undefined, errors: {}, province, selection,
        provinces: this.state.provinces.some(item => item.id === province.id) ? this.state.provinces : [...this.state.provinces, province],
        localities: [{ id: selection.localityId, name: selection.localityName, provinceId: province.id }],
        localityStatus: 'ready',
      })
      await this.loadLocalities()
    } catch (error) {
      if (generation === this.generation && !controller.signal.aborted)
        this.update({ mode: 'form', problem: error instanceof PositionError ? error.reason : 'unavailable' })
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
      if (!this.current('provinces', controller)) return
      const selected = this.state.province
      this.update({
        provinces: selected && !provinces.some(item => item.id === selected.id) ? [...provinces, selected] : provinces,
        provinceStatus: 'ready',
      })
    } catch { if (this.current('provinces', controller)) this.update({ provinceStatus: 'error' }) }
  }
  async selectProvince(province: Province) {
    if (!this.state.provinces.some(item => item.id === province.id)) return
    this.stopDetection()
    this.update({ mode: 'form', province, selection: null, localities: [], localityStatus: 'idle', errors: {} })
    await this.loadLocalities()
  }
  async loadLocalities() {
    const provinceId = this.state.province?.id
    if (!provinceId) return
    const controller = this.flight('localities')
    this.update({ localityStatus: 'loading' })
    try {
      const localities: Locality[] = []
      let page = 0
      let total = 0
      do {
        const response = await this.api.get<{ items: unknown[]; total: number }>(
          `/locations/localities?provinceId=${encodeURIComponent(provinceId)}&q=&page=${page}&size=${PAGE_SIZE}`,
          { signal: controller.signal, timeoutMs: 12000 })
        if (!this.current('localities', controller) || this.state.province?.id !== provinceId) return
        const batch = rows(response).map(row => {
          if (typeof row.id !== 'string' || typeof row.name !== 'string' || row.provinceId !== provinceId) throw new Error('Invalid locality')
          return { id: row.id, name: row.name, provinceId }
        })
        if (!Number.isInteger(response.total) || response.total < 0) throw new Error('Invalid result count')
        total = response.total
        localities.push(...batch)
        page += 1
        if (!batch.length || batch.length < PAGE_SIZE) break
      } while (localities.length < total && page < 40)
      if (!this.current('localities', controller) || this.state.province?.id !== provinceId) return
      const selected = this.state.selection
      if (selected?.provinceId === provinceId && !localities.some(item => item.id === selected.localityId))
        localities.unshift({ id: selected.localityId, name: selected.localityName, provinceId })
      this.update({ localities, localityStatus: 'ready' })
    } catch { if (this.current('localities', controller)) this.update({ localityStatus: 'error' }) }
  }
  selectLocality(locality: Locality) {
    if (!this.state.localities.some(item => item.id === locality.id) || this.state.province?.id !== locality.provinceId) return
    this.stopDetection()
    this.update({
      mode: 'form', problem: undefined, errors: {},
      selection: {
        countryCode: 'AR', provinceId: locality.provinceId, provinceName: this.state.province.name,
        localityId: locality.id, localityName: locality.name,
      },
    })
  }
  validate() {
    const errors = {
      ...(!this.state.province ? { province: 'Seleccioná una provincia.' } : {}),
      ...(!this.state.selection ? { locality: 'Seleccioná una localidad.' } : {}),
    }
    this.update({ errors })
    return Object.keys(errors).length === 0
  }
  request(): LocationRequest | undefined {
    const value = this.state.selection
    if (!value) return undefined
    return {
      countryCode: 'AR', provinceId: value.provinceId, localityId: value.localityId,
      ...(value.latitude !== undefined && value.longitude !== undefined ? { latitude: value.latitude, longitude: value.longitude } : {}),
    }
  }
}
