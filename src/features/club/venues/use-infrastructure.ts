import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { apiClient } from '@/lib/api-client'
import { Infrastructure, VenueDraft, type Venue, type VenueLocation } from './venues-model'

export function useInfrastructure(clubId: string | null) {
  const model = useMemo(() => new Infrastructure(apiClient, clubId ?? ''), [clubId])
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot)
  useEffect(() => { if (clubId) void model.load(); return () => model.cancel() }, [model, clubId])
  return { model, state }
}
export function useVenueDraft(original: Venue | null, club: VenueLocation | null) {
  const model = useMemo(() => new VenueDraft(apiClient, original, club), [original, club])
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot)
  useEffect(() => { void model.initialize(); return () => model.cancel() }, [model])
  return { model, state }
}
