import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { INITIAL_CATALOG_STATE, createCatalogLoader, settleCatalog, type CatalogState } from './pricing-model'

const TIMEOUT_MS = 20000

/**
 * Public GET /plans read (KAN-136) for the native plan comparison. `refresh` keeps the visible catalog on failure
 * (pull-to-refresh); `retry` restarts from loading when nothing is shown. Both reuse a read already in flight.
 */
export function usePlanCatalog() {
  const [state, setState] = useState<CatalogState>(INITIAL_CATALOG_STATE)
  const loader = useRef<ReturnType<typeof createCatalogLoader> | null>(null)
  if (!loader.current) loader.current = createCatalogLoader((signal) => apiClient.get<unknown>('/plans', {
    timeoutMs: TIMEOUT_MS, signal, headers: { 'Cache-Control': 'no-cache' },
  }))

  const read = useCallback((keepVisible: boolean) => {
    const current = loader.current
    if (!current) return Promise.resolve()
    return current.load((result) => setState((previous) => settleCatalog(previous, result, keepVisible)))
  }, [])

  useEffect(() => {
    const current = loader.current
    void read(false)
    return () => current?.dispose()
  }, [read])

  const refresh = useCallback(() => read(true), [read])

  const retry = useCallback(() => {
    if (loader.current?.busy) return
    setState(INITIAL_CATALOG_STATE)
    void read(false)
  }, [read])

  return { ...state, refresh, retry }
}
