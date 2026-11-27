/** KAN-78 divisions: pure model shared by the wizard (steps 4–6) and the hub «Categorías» section. */
export type Criterion = 'SIMPLE' | 'SUMA' | 'COMBINADO' | 'OPEN'
export type GenderType = 'MALE' | 'FEMALE' | 'MIXED'
export type DivisionStatus = 'DRAFT' | 'PUBLISHED' | 'INSCRIPTION_OPEN' | 'INSCRIPTION_CLOSED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'
export type CatalogCategory = { id: string; code: string; name: string; rankOrder: number }

/** Response of the service (`DivisionResponse`, docs/division-management-api.md). */
export type Division = {
  id: string
  eventId: string
  name: string
  criterion: Criterion
  categoryId: string | null
  categoryCode: string | null
  categoryName: string | null
  secondCategoryId: string | null
  secondCategoryCode: string | null
  secondCategoryName: string | null
  sumTarget: number | null
  genderType: GenderType
  maxPairs: number
  substitutesAllowed: boolean
  status: DivisionStatus
  cancelledAt: string | null
}

/** One division as written to the API (`CreateDivisionRequest` / full `UpdateDivisionRequest`). */
export type DivisionWrite = {
  criterion: Criterion
  genderType: GenderType
  categoryId?: string
  secondCategoryId?: string
  sumTarget?: number
  maxPairs: number
  substitutesAllowed: boolean
}

export type DivisionLimit = {
  key: string
  planCode: string
  eventId: string | null
  state: 'LIMITED' | 'UNLIMITED'
  limit: number | null
  used: number
  remaining: number | null
  reached: boolean
}

/** Step 4 tab. OPEN is chosen from the Simple grid, as in the KAN-77 handoff. */
export type DivisionType = 'SIMPLE' | 'SUMA' | 'COMBINADO'
export const OPEN = 'OPEN'

/** Step 4 + 5 in progress. Text fields keep what the user typed, valid or not. */
export type Selection = {
  genderType: GenderType
  type: DivisionType
  /** Simple: catalog ids, or exactly [OPEN]. */
  categoryIds: string[]
  sumText: string
  first: string
  second: string
  maxPairsText: string
  substitutesAllowed: boolean | null
}

export type WizardDivision = DivisionWrite & { localId: string }

/** Anything shown as a division card: a wizard item or a saved division. */
type DivisionLike = Pick<DivisionWrite, 'criterion' | 'genderType'> & {
  categoryId?: string | null; secondCategoryId?: string | null; sumTarget?: number | null
}

export const genderLabels: Record<GenderType, string> = { MALE: 'Caballeros', FEMALE: 'Damas', MIXED: 'Mixto' }
export const typeLabels: Record<DivisionType, string> = { SIMPLE: 'Simple', SUMA: 'Suma', COMBINADO: 'Combinado' }

export function emptySelection(): Selection {
  return { genderType: 'MALE', type: 'SIMPLE', categoryIds: [], sumText: '', first: '', second: '', maxPairsText: '', substitutesAllowed: null }
}

/** Catalog in the order of the step 4 grid: weakest first (8va … 1ra). */
export function gridOrder(catalog: CatalogCategory[]) {
  return [...catalog].sort((a, b) => b.rankOrder - a.rankOrder)
}

/** Category number used by Suma: leading digits of the platform code («6TA» → 6), like the service. */
export function categoryLevel(category: CatalogCategory) {
  const digits = /^(\d+)/.exec(category.code)
  return digits ? Number(digits[1]) : null
}

/** Targets formable as the sum of two catalog categories (2–16 with 1ra–8va). */
export function sumRange(catalog: CatalogCategory[]) {
  const levels = catalog.map(categoryLevel).filter((level): level is number => level !== null)
  if (levels.length === 0) return null
  return { min: Math.min(...levels) * 2, max: Math.max(...levels) * 2, levels }
}

/** Suma target state: empty, not an integer / outside the range, or in range but not formable. */
export function sumProblem(text: string, catalog: CatalogCategory[]): null | 'range' | 'unformable' {
  if (text.trim() === '' || validSum(text, catalog)) return null
  const range = sumRange(catalog)
  const value = text.trim()
  if (!range || !/^\d+$/.test(value) || Number(value) < range.min || Number(value) > range.max) return 'range'
  return 'unformable'
}

export function validSum(text: string, catalog: CatalogCategory[]) {
  const range = sumRange(catalog)
  if (!range || !/^\d+$/.test(text.trim())) return false
  const target = Number(text.trim())
  return range.levels.some(a => range.levels.includes(target - a))
}

export function validMaxPairs(text: string) {
  const value = text.trim()
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 2147483647
}

/** Simple grid toggle: OPEN excludes numeric categories and vice versa; editing keeps one choice. */
export function toggleCategory(selected: string[], id: string, single = false) {
  if (selected.includes(id)) return selected.filter(value => value !== id)
  if (id === OPEN || single) return [id]
  return [...selected.filter(value => value !== OPEN), id]
}

/** How many divisions the selection creates: one per Simple category, otherwise one. */
export function selectionSize(selection: Selection) {
  return selection.type === 'SIMPLE' ? selection.categoryIds.length : 1
}

export function validCriterion(selection: Selection, catalog: CatalogCategory[]) {
  switch (selection.type) {
    case 'SIMPLE': return selection.categoryIds.length > 0
    case 'SUMA': return validSum(selection.sumText, catalog)
    case 'COMBINADO': return Boolean(selection.first && selection.second)
  }
}

export function validSelection(selection: Selection, catalog: CatalogCategory[]) {
  return validCriterion(selection, catalog) && validMaxPairs(selection.maxPairsText) && selection.substitutesAllowed !== null
}

/** Expands a complete selection: Simple with several categories → one independent division each. */
export function toWrites(selection: Selection): DivisionWrite[] {
  const common = {
    genderType: selection.genderType,
    maxPairs: Number(selection.maxPairsText.trim()),
    substitutesAllowed: selection.substitutesAllowed === true,
  }
  switch (selection.type) {
    case 'SIMPLE':
      return selection.categoryIds.includes(OPEN)
        ? [{ ...common, criterion: 'OPEN' }]
        : selection.categoryIds.map(categoryId => ({ ...common, criterion: 'SIMPLE', categoryId }))
    case 'SUMA': return [{ ...common, criterion: 'SUMA', sumTarget: Number(selection.sumText.trim()) }]
    case 'COMBINADO': return [{ ...common, criterion: 'COMBINADO', categoryId: selection.first, secondCategoryId: selection.second }]
  }
}

/** Back to the form: one or more divisions of the same batch (Simple) or a single division. */
export function toSelection(divisions: DivisionWrite[]): Selection {
  const [first] = divisions
  const base = {
    ...emptySelection(),
    genderType: first.genderType,
    maxPairsText: String(first.maxPairs),
    substitutesAllowed: first.substitutesAllowed,
  }
  switch (first.criterion) {
    case 'SIMPLE': return { ...base, categoryIds: divisions.map(division => division.categoryId!).filter(Boolean) }
    case 'OPEN': return { ...base, categoryIds: [OPEN] }
    case 'SUMA': return { ...base, type: 'SUMA', sumText: String(first.sumTarget ?? '') }
    case 'COMBINADO': return { ...base, type: 'COMBINADO', first: first.categoryId ?? '', second: first.secondCategoryId ?? '' }
  }
}

export function divisionWrite(division: Division): DivisionWrite {
  return {
    criterion: division.criterion,
    genderType: division.genderType,
    ...(division.categoryId ? { categoryId: division.categoryId } : {}),
    ...(division.secondCategoryId ? { secondCategoryId: division.secondCategoryId } : {}),
    ...(division.sumTarget !== null ? { sumTarget: division.sumTarget } : {}),
    maxPairs: division.maxPairs,
    substitutesAllowed: division.substitutesAllowed,
  }
}

type Names = (id: string | undefined | null) => string

export function catalogNames(catalog: CatalogCategory[]): Names {
  return id => catalog.find(category => category.id === id)?.name ?? ''
}

/** «6ta», «Suma 13», «6ta + 7ma» or «OPEN». */
export function criterionDetail(division: DivisionLike, name: Names) {
  switch (division.criterion) {
    case 'SIMPLE': return name(division.categoryId)
    case 'SUMA': return 'Suma ' + division.sumTarget
    case 'COMBINADO': return name(division.categoryId) + ' + ' + name(division.secondCategoryId)
    case 'OPEN': return 'OPEN'
  }
}

/** Card title, e.g. «Caballeros · 6ta». */
export function divisionTitle(division: DivisionLike, name: Names) {
  return genderLabels[division.genderType] + ' · ' + criterionDetail(division, name)
}

/**
 * Name the service generates when none is sent (docs/division-management-api.md «Generated names»):
 * Simple keeps the KAN-146 «5TA MALE»; the rest use the readable title, e.g. «Caballeros · Suma 13».
 */
export function generatedName(division: Division) {
  const gender = genderLabels[division.genderType]
  const label = (code: string | null) => (code ?? '').trim().toLowerCase()
  switch (division.criterion) {
    case 'SIMPLE': return (division.categoryCode ?? '') + ' ' + division.genderType
    case 'SUMA': return gender + ' · Suma ' + division.sumTarget
    case 'COMBINADO': return gender + ' · ' + label(division.categoryCode) + ' + ' + label(division.secondCategoryCode)
    case 'OPEN': return gender + ' · OPEN'
  }
}

/** Saved division title: the organizer's custom name when there is one, otherwise the card title. */
export function savedTitle(division: Division) {
  const custom = division.name?.trim()
  return custom && custom !== generatedName(division) ? custom : divisionTitle(division, savedNames(division))
}

/** Card «Tipo» row: Simple, Suma 13, Combinado or OPEN. */
export function criterionLabel(division: DivisionLike) {
  switch (division.criterion) {
    case 'SIMPLE': return 'Simple'
    case 'SUMA': return 'Suma ' + division.sumTarget
    case 'COMBINADO': return 'Combinado'
    case 'OPEN': return 'OPEN'
  }
}

/** Saved divisions carry their category names; no catalog request is needed to show them. */
export function savedNames(division: Division): Names {
  return id => id === division.categoryId ? division.categoryName ?? '' : id === division.secondCategoryId ? division.secondCategoryName ?? '' : ''
}

/** Names of a saved division as a minimal catalog, to reuse the summary helpers without a request. */
export function savedCatalog(division: Division): CatalogCategory[] {
  return [[division.categoryId, division.categoryCode, division.categoryName], [division.secondCategoryId, division.secondCategoryCode, division.secondCategoryName]]
    .filter((entry): entry is [string, string, string] => Boolean(entry[0] && entry[2]))
    .map(([id, code, name]) => ({ id, code: code ?? '', name, rankOrder: 0 }))
}

/** Step 5 / edit context line, e.g. «Simple · Caballeros 6ta». */
export function selectionSummary(selection: Selection, catalog: CatalogCategory[]) {
  const name = catalogNames(catalog)
  const gender = genderLabels[selection.genderType]
  switch (selection.type) {
    case 'SIMPLE':
      return selection.categoryIds.includes(OPEN)
        ? 'OPEN · ' + gender
        : 'Simple · ' + gender + ' ' + selection.categoryIds.map(name).join(', ')
    case 'SUMA': return 'Suma ' + selection.sumText.trim() + ' · ' + gender
    case 'COMBINADO': return 'Combinado · ' + gender + ' ' + name(selection.first) + ' + ' + name(selection.second)
  }
}

export function activeDivisions(divisions: Division[]) {
  return divisions.filter(division => division.status !== 'CANCELLED')
}

/** Remaining quota for new divisions, or null without a ceiling (or when the limit is unknown). */
export function remainingQuota(limit: DivisionLimit | undefined, used: number) {
  if (!limit || limit.state === 'UNLIMITED' || limit.limit === null) return null
  return Math.max(0, limit.limit - used)
}

/** 403 code that distinguishes the plan ceiling from any other authorization failure. */
export const PLAN_DIVISION_LIMIT = 'PLAN_DIVISION_LIMIT_EXCEEDED'

export function planLimitRemaining(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 403) return null
  const body = 'details' in error ? error.details : undefined
  if (!body || typeof body !== 'object' || !('code' in body) || body.code !== PLAN_DIVISION_LIMIT) return null
  const details = 'details' in body ? body.details : undefined
  const remaining = details && typeof details === 'object' && 'remaining' in details ? Number(details.remaining) : 0
  return Number.isFinite(remaining) ? Math.max(0, remaining) : 0
}

export function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : undefined
}

function more(count: number) {
  return count === 1 ? '1 categoría más' : count + ' categorías más'
}

/**
 * KAN-149 #2/#3 reason. `remaining` is shown when a Simple batch does not fit, or after a 403.
 * The hub uses «categoría» (KAN-254); the wizard keeps «división» (KAN-77).
 */
export function limitReason(limit: number, planCode: string, place: 'wizard' | 'hub', remaining?: number) {
  const tail = remaining !== undefined && remaining > 0 ? ' Podés agregar ' + more(remaining) + '.' : null
  if (place === 'hub') {
    return {
      title: 'Límite de categorías',
      detail: (tail ? planCode + ' permite ' + limit + ' categorías por torneo.' + tail
        : 'Alcanzaste las ' + limit + ' categorías permitidas por tu plan en este torneo.'),
    }
  }
  return {
    title: 'Límite de divisiones',
    detail: planCode + ' permite ' + limit + ' divisiones por torneo.' + (tail ?? ' Podés continuar con las divisiones que ya agregaste.'),
  }
}

/** Stable Idempotency-Key per wizard intent: reused while the payload is the same, new after a change. */
export type IntentStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function intentKey(store: IntentStore | undefined, clubId: string, fingerprint: string, create: () => string) {
  const slot = 'padelcheck:event-draft-intent:' + clubId
  try {
    const saved = JSON.parse(store?.getItem(slot) ?? 'null') as { key?: unknown; fingerprint?: unknown } | null
    if (saved && typeof saved.key === 'string' && saved.fingerprint === fingerprint) return saved.key
  } catch {
    // A malformed slot is replaced below.
  }
  const key = create()
  try {
    store?.setItem(slot, JSON.stringify({ key, fingerprint }))
  } catch {
    // Without storage the key still lives for this attempt and its in-memory retries.
  }
  return key
}

export function clearIntent(store: IntentStore | undefined, clubId: string) {
  try {
    store?.removeItem('padelcheck:event-draft-intent:' + clubId)
  } catch {
    // Nothing to clear.
  }
}

/** Steps 4–6 state, owned by the event wizard so going back to step 3 keeps it (UI1). */
export type DivisionPlan = {
  step: 4 | 5 | 6
  divisions: WizardDivision[]
  selection: Selection
  /** Divisions replaced when the current selection is committed (edit from the review, or back). */
  editing: string[] | null
  /** Entered from step 6 («Agregar división» / «Editar»): back returns to the review. */
  fromReview: boolean
  /** Last committed batch, reopened when coming back from the review or from step 3. */
  lastBatch: string[]
  touched: boolean
}

export function initialPlan(): DivisionPlan {
  return { step: 4, divisions: [], selection: emptySelection(), editing: null, fromReview: false, lastBatch: [], touched: false }
}

/** Reopens the last batch for editing so moving back and forth never duplicates divisions. */
export function resumePlan(plan: DivisionPlan): DivisionPlan {
  const batch = plan.divisions.filter(division => plan.lastBatch.includes(division.localId))
  if (batch.length === 0) return { ...plan, editing: null, fromReview: false, selection: emptySelection(), touched: false }
  return { ...plan, editing: batch.map(division => division.localId), fromReview: false, selection: toSelection(batch), touched: false }
}


export function withoutLocalId(division: WizardDivision): DivisionWrite {
  const write: Partial<WizardDivision> = { ...division }
  delete write.localId
  return write as DivisionWrite
}

/**
 * Pull-to-refresh guard (MN3): repeated gestures while a refresh is in flight do not start new requests,
 * and the indicator always stops, on success and on error.
 */
export function singleFlight(run: () => Promise<unknown>, setRefreshing: (refreshing: boolean) => void) {
  let pending = false
  return async () => {
    if (pending) return
    pending = true
    setRefreshing(true)
    try {
      await run()
    } catch {
      // Errors are surfaced by each query (visible data stays, retry offered); the gesture only owns the indicator.
    } finally {
      pending = false
      setRefreshing(false)
    }
  }
}
