import { apiClient, ApiError } from '@/lib/api-client'
import {
  checkoutBody,
  isChargeReference,
  isEventId,
  parseCatalog,
  parseCharge,
  parseCheckoutLink,
  parseEvents,
  parseQuote,
  parseResumePreview,
  parseSubscription,
  parseUsage,
  usagePath,
  type AdjustmentQuote,
  type BillingCharge,
  type CheckoutLink,
  type ClubEventOption,
  type ClubSubscription,
  type ClubUsage,
  type PlanOffer,
  type ResumePreview,
} from './plan-model'

export class PlanContractError extends Error {
  constructor() {
    super('Invalid billing response')
    this.name = 'PlanContractError'
  }
}

function signal(init?: AbortSignal): { signal?: AbortSignal; timeoutMs: number } {
  return { signal: init, timeoutMs: 20000 }
}

async function read<T>(path: string, parse: (value: unknown) => T | null, init?: AbortSignal): Promise<T> {
  const payload = await apiClient.get<unknown>(path, signal(init))
  const parsed = parse(payload)
  if (!parsed) throw new PlanContractError()
  return parsed
}

export const planApi = {
  subscription(clubId: string, init?: AbortSignal): Promise<ClubSubscription> {
    return read(`/clubs/${encodeURIComponent(clubId)}/billing/subscription`, parseSubscription, init)
  },
  usage(clubId: string, eventId: string | null, init?: AbortSignal): Promise<ClubUsage> {
    return read(usagePath(clubId, eventId), parseUsage, init)
  },
  charge(clubId: string, reference: string, init?: AbortSignal): Promise<BillingCharge> {
    if (!isChargeReference(reference)) throw new PlanContractError()
    return read(`/clubs/${encodeURIComponent(clubId)}/billing/charges/${encodeURIComponent(reference)}`, parseCharge, init)
  },
  events(clubId: string, init?: AbortSignal): Promise<ClubEventOption[]> {
    return read(`/clubs/${encodeURIComponent(clubId)}/events`, parseEvents, init)
  },
  plans(init?: AbortSignal): Promise<PlanOffer[]> {
    return read('/plans', parseCatalog, init)
  },
  quote(clubId: string, init?: AbortSignal): Promise<AdjustmentQuote> {
    return read(`/clubs/${encodeURIComponent(clubId)}/billing/adjustment`, parseQuote, init)
  },
  checkout(clubId: string, planCode: 'PRO' | 'ELITE', init?: AbortSignal): Promise<CheckoutLink> {
    const body = checkoutBody(planCode)
    if (!body) throw new PlanContractError()
    return apiClient.post<unknown>(`/clubs/${encodeURIComponent(clubId)}/billing/checkout`, body, signal(init)).then(payload => {
      const parsed = parseCheckoutLink(payload)
      if (!parsed || parsed.planCode !== planCode) throw new PlanContractError()
      return parsed
    })
  },
  adjustmentCheckout(clubId: string, init?: AbortSignal): Promise<CheckoutLink> {
    return apiClient.post<unknown>(`/clubs/${encodeURIComponent(clubId)}/billing/adjustment/checkout`, undefined, signal(init)).then(payload => {
      const parsed = parseCheckoutLink(payload)
      if (!parsed) throw new PlanContractError()
      return parsed
    })
  },
  resumePreview(clubId: string, init?: AbortSignal): Promise<ResumePreview> {
    return read(`/clubs/${encodeURIComponent(clubId)}/billing/recurrence/resume`, parseResumePreview, init)
  },
  confirmResume(clubId: string, init?: AbortSignal): Promise<ResumePreview> {
    return apiClient.post<unknown>(`/clubs/${encodeURIComponent(clubId)}/billing/recurrence/resume`, undefined, signal(init)).then(payload => {
      const parsed = parseResumePreview(payload)
      if (!parsed) throw new PlanContractError()
      return parsed
    })
  },
}

export function planFailure(error: unknown): 'unauthorized' | 'forbidden' | 'not-found' | 'timeout' | 'network' | 'invalid' {
  if (error instanceof PlanContractError) return 'invalid'
  if (error instanceof ApiError) {
    if (error.status === 401) return 'unauthorized'
    if (error.status === 403) return 'forbidden'
    if (error.status === 404) return 'not-found'
    if (error.kind === 'timeout') return 'timeout'
    if (error.kind === 'network' || error.kind === 'cancelled') return 'network'
  }
  return 'invalid'
}

export function isEventIdForUsage(value: string | null): value is string {
  return isEventId(value)
}
