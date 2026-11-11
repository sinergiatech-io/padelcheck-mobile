import { useEffect, useState, useSyncExternalStore } from 'react'
import { createApiClient } from '@/lib/http-client'
import { API_BASE } from '@/lib/constants'
import { RegistrationLocation, type PositionProvider } from './registration-location'

const api = createApiClient({ baseUrl: API_BASE, getToken: () => null })
export function useRegistrationLocation(provider: PositionProvider, enabled: boolean) {
  const [model] = useState(() => new RegistrationLocation(api, provider))
  const state = useSyncExternalStore(model.subscribe, () => model.state)
  useEffect(() => {
    if (enabled) void model.initialize()
    return () => model.cancel()
  }, [model, enabled])
  return { model, state }
}
