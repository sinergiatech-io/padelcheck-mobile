/**
 * Public plan comparison (KAN-141). Pure model over the public GET /plans catalog (KAN-136):
 * no commercial value is hardcoded and an absent datum is never mapped to 0, No or Unlimited.
 * Kept free of imports so web and native share the same rules and node tests.
 */

export type OfferCode = 'FREE' | 'PRO' | 'ELITE'
export const OFFER_CODES: readonly OfferCode[] = ['FREE', 'PRO', 'ELITE']

export type LimitKey = 'MAX_ACTIVE_TOURNAMENTS' | 'MAX_ENTRIES_PER_EVENT' | 'MAX_DIVISIONS_PER_EVENT' | 'MAX_STAFF_USERS'
export type FlagKey = 'ADVANCED_STATS' | 'CUSTOM_BRANDING' | 'PRIORITY_SUPPORT'

export type LimitValue = { kind: 'limited'; value: number } | { kind: 'unlimited' } | { kind: 'absent' }
export type FlagValue = 'yes' | 'no' | 'absent'
export type PriceView =
  | { kind: 'free' }
  | { kind: 'pending' }
  | { kind: 'available'; amount: string; currency: string; period: 'MONTH' | 'YEAR' }

export interface PricingOffer {
  code: OfferCode
  /** False when the offer is missing or any of its fields is absent/invalid: its CTA stays disabled. */
  complete: boolean
  /** False when the catalog did not return this offer at all. */
  present: boolean
  limits: Record<LimitKey, LimitValue>
  flags: Record<FlagKey, FlagValue>
  price: PriceView | null
}

export type PricingCatalog =
  | { status: 'empty' }
  | { status: 'ready' | 'incomplete'; offers: PricingOffer[] }

export const LIMITS: readonly { key: LimitKey; label: string; unlimited: string }[] = [
  { key: 'MAX_ACTIVE_TOURNAMENTS', label: 'Torneos activos', unlimited: 'Ilimitados' },
  { key: 'MAX_ENTRIES_PER_EVENT', label: 'Parejas confirmadas por evento', unlimited: 'Ilimitadas' },
  { key: 'MAX_DIVISIONS_PER_EVENT', label: 'Divisiones por evento', unlimited: 'Ilimitadas' },
  { key: 'MAX_STAFF_USERS', label: 'Usuarios staff', unlimited: 'Ilimitados' },
]

export const FLAGS: readonly { key: FlagKey; label: string }[] = [
  { key: 'ADVANCED_STATS', label: 'Estadísticas avanzadas' },
  { key: 'CUSTOM_BRANDING', label: 'Branding personalizado' },
  { key: 'PRIORITY_SUPPORT', label: 'Soporte prioritario' },
]

/** Static purpose copy from the approved frames; it describes the offer and never replaces entitlements. */
export const OFFER_PURPOSE: Record<OfferCode, string> = {
  FREE: 'Para empezar.',
  PRO: 'Para clubes con más actividad.',
  ELITE: 'Para mayor volumen y múltiples sedes.',
}

export const OFFER_CTA: Record<OfferCode, string> = {
  FREE: 'Empezar gratis',
  PRO: 'Crear mi club',
  ELITE: 'Crear mi club',
}

export const PLAN_NOTES: readonly string[] = [
  'El límite de parejas se comparte entre todas las divisiones del evento; la lista de espera no lo consume.',
  'La suscripción corresponde al club. No existe un límite de jugadores del club por plan.',
  'Los planes pagos requieren confirmación del pago.',
  'En esta etapa, las inscripciones al torneo se cobran por fuera de Padel Check.',
]

export const MISSING = 'Sin datos'
export const PRICE_PENDING = 'Precio por confirmar'
export const PRICE_FREE = 'Gratis'

const LIMIT_KEYS = LIMITS.map((item) => item.key)
const FLAG_KEYS = FLAGS.map((item) => item.key)
const AMOUNT = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function limitOf(feature: Record<string, unknown> | undefined): LimitValue {
  if (!feature || (feature.kind != null && feature.kind !== 'LIMIT')) return { kind: 'absent' }
  if (feature.state === 'UNLIMITED') return { kind: 'unlimited' }
  if (feature.state === 'LIMITED' && typeof feature.limit === 'number' && Number.isInteger(feature.limit) && feature.limit >= 0) {
    return { kind: 'limited', value: feature.limit }
  }
  return { kind: 'absent' }
}

function flagOf(feature: Record<string, unknown> | undefined): FlagValue {
  if (!feature || (feature.kind != null && feature.kind !== 'BOOLEAN')) return 'absent'
  if (feature.state === 'ENABLED') return 'yes'
  if (feature.state === 'DISABLED') return 'no'
  return 'absent'
}

function priceOf(raw: Record<string, unknown>): PriceView | null {
  const price = record(raw.price)
  if (raw.free === true) return !price || price.status === 'FREE' ? { kind: 'free' } : null
  if (raw.free !== false || !price) return null
  if (price.status === 'PENDING') return { kind: 'pending' }
  if (price.status !== 'AVAILABLE') return null
  const { amount, currency, period } = price
  if (typeof amount === 'string' && AMOUNT.test(amount) && Number(amount) > 0
    && typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)
    && (period === 'MONTH' || period === 'YEAR')) {
    return { kind: 'available', amount, currency, period }
  }
  // AVAILABLE without a complete triple is treated as not confirmed rather than invented.
  return { kind: 'pending' }
}

function emptyOffer(code: OfferCode): PricingOffer {
  const limits = {} as Record<LimitKey, LimitValue>
  for (const key of LIMIT_KEYS) limits[key] = { kind: 'absent' }
  const flags = {} as Record<FlagKey, FlagValue>
  for (const key of FLAG_KEYS) flags[key] = 'absent'
  return { code, complete: false, present: false, limits, flags, price: null }
}

function offerOf(code: OfferCode, raw: Record<string, unknown>): PricingOffer {
  const offer = emptyOffer(code)
  offer.present = true
  const features = new Map<string, Record<string, unknown>>()
  if (Array.isArray(raw.features)) {
    for (const item of raw.features) {
      const feature = record(item)
      if (feature && typeof feature.key === 'string' && !features.has(feature.key)) features.set(feature.key, feature)
    }
  }
  for (const key of LIMIT_KEYS) offer.limits[key] = limitOf(features.get(key))
  for (const key of FLAG_KEYS) offer.flags[key] = flagOf(features.get(key))
  offer.price = priceOf(raw)
  offer.complete = offer.price !== null
    && LIMIT_KEYS.every((key) => offer.limits[key].kind !== 'absent')
    && FLAG_KEYS.every((key) => offer.flags[key] !== 'absent')
  return offer
}

/**
 * Reads the raw GET /plans payload. Returns null for a payload that is not a catalog (shown as an error),
 * `empty` when no FREE/PRO/ELITE offer is published, and otherwise the three offers in canonical order.
 */
export function parsePricingCatalog(value: unknown): PricingCatalog | null {
  if (!Array.isArray(value)) return null
  const byCode = new Map<string, Record<string, unknown>>()
  for (const item of value) {
    const raw = record(item)
    if (raw && typeof raw.code === 'string' && !byCode.has(raw.code)) byCode.set(raw.code, raw)
  }
  if (!OFFER_CODES.some((code) => byCode.has(code))) return { status: 'empty' }
  const offers = OFFER_CODES.map((code) => {
    const raw = byCode.get(code)
    return raw ? offerOf(code, raw) : emptyOffer(code)
  })
  return { status: offers.every((offer) => offer.complete) ? 'ready' : 'incomplete', offers }
}

export function limitLabel(key: LimitKey, value: LimitValue): string {
  if (value.kind === 'limited') return String(value.value)
  if (value.kind === 'unlimited') return LIMITS.find((item) => item.key === key)?.unlimited ?? MISSING
  return MISSING
}

export function flagLabel(value: FlagValue): string {
  return value === 'yes' ? 'Sí' : value === 'no' ? 'No' : MISSING
}

const PERIOD_LABEL: Record<'MONTH' | 'YEAR', string> = { MONTH: 'mes', YEAR: 'año' }

/** Formats a complete catalog price for es-AR, always naming the ISO currency and the period. */
export function priceLabel(price: PriceView | null): string {
  if (!price) return MISSING
  if (price.kind === 'free') return PRICE_FREE
  if (price.kind === 'pending') return PRICE_PENDING
  let amount = `${price.currency} ${price.amount}`
  try {
    amount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: price.currency,
      currencyDisplay: 'code',
      minimumFractionDigits: price.amount.includes('.') ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(Number(price.amount))
  } catch {
    // Unknown currency for this runtime: keep the plain catalog values.
  }
  return `${amount.replace(/\u00a0/g, ' ')} / ${PERIOD_LABEL[price.period]}`
}

/** Accessible description of an offer price, without the visual slash. */
export function priceSpoken(price: PriceView | null): string {
  if (price?.kind === 'available') return priceLabel(price).replace(' / ', ' por ')
  return priceLabel(price)
}

export function offerCtaEnabled(catalog: PricingCatalog | null, code: OfferCode): boolean {
  if (!catalog || catalog.status === 'empty') return false
  return catalog.offers.find((offer) => offer.code === code)?.complete === true
}

/** Keyboard navigation inside the offer segment group: arrows move one step without wrapping; Home/End jump. */
export function segmentKeyTarget(key: string, current: number, count: number): number | null {
  if (count <= 0) return null
  if (key === 'ArrowRight') return Math.min(current + 1, count - 1)
  if (key === 'ArrowLeft') return Math.max(current - 1, 0)
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

/**
 * Offer in focus after a manual scroll settles. Offsets are clamped by the scroll container, so the offer whose
 * start is nearest wins, and reaching the end of the strip always announces the last offer.
 */
export function offerAtOffset(offset: number, maxOffset: number, starts: readonly number[]): number {
  if (starts.length === 0) return 0
  if (maxOffset > 0 && offset >= maxOffset - 1) return starts.length - 1
  let best = 0
  for (let index = 1; index < starts.length; index += 1) {
    if (Math.abs(starts[index] - offset) < Math.abs(starts[best] - offset)) best = index
  }
  return best
}

/** Target scroll offset for an offer, clamped so the strip never shows empty space after the last card. */
export function offsetForOffer(index: number, starts: readonly number[], maxOffset: number): number {
  const start = starts[index] ?? 0
  return Math.max(0, Math.min(start, Math.max(0, maxOffset)))
}

export type CatalogPhase = 'loading' | 'error' | 'ready'

export interface CatalogState {
  phase: CatalogPhase
  catalog: PricingCatalog | null
  /** A refresh failed while previous data stays visible (native pull-to-refresh). */
  refreshFailed: boolean
}

export const INITIAL_CATALOG_STATE: CatalogState = { phase: 'loading', catalog: null, refreshFailed: false }

/**
 * Serialises catalog reads: a request already in flight is reused instead of duplicated, and only the
 * latest started request may publish its result, so a late response never replaces newer data.
 */
export function createCatalogLoader(fetchCatalog: (signal?: AbortSignal) => Promise<unknown>) {
  let running: Promise<void> | null = null
  let generation = 0
  return {
    load(publish: (result: { ok: true; catalog: PricingCatalog } | { ok: false }) => void): Promise<void> {
      if (running) return running
      const mine = ++generation
      const task = (async () => {
        try {
          const catalog = parsePricingCatalog(await fetchCatalog())
          if (mine === generation) publish(catalog ? { ok: true, catalog } : { ok: false })
        } catch {
          if (mine === generation) publish({ ok: false })
        } finally {
          if (mine === generation) running = null
        }
      })()
      running = task
      return task
    },
    /** Invalidates any in-flight result (e.g. on unmount); the next load starts a fresh read. */
    dispose() {
      generation += 1
      running = null
    },
    get busy() {
      return running !== null
    },
  }
}

/** State after a read finishes. With `keepVisible`, a failed refresh keeps the shown catalog and flags the error. */
export function settleCatalog(
  state: CatalogState,
  result: { ok: true; catalog: PricingCatalog } | { ok: false },
  keepVisible: boolean,
): CatalogState {
  if (result.ok) return { phase: 'ready', catalog: result.catalog, refreshFailed: false }
  if (keepVisible && state.phase === 'ready' && state.catalog) return { ...state, refreshFailed: true }
  return { phase: 'error', catalog: null, refreshFailed: false }
}

/** Keeps the offer in focus after a refresh when it is still published; otherwise falls back to FREE. */
export function focusAfterRefresh(previous: OfferCode, catalog: PricingCatalog | null): OfferCode {
  if (!catalog || catalog.status === 'empty') return 'FREE'
  return catalog.offers.some((offer) => offer.code === previous && offer.present) ? previous : 'FREE'
}
