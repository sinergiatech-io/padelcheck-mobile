import { useState, useSyncExternalStore } from 'react'
import { Linking, Platform as NativePlatform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { createApiClient } from '@/lib/http-client'
import { API_BASE } from '@/lib/constants'
import { getStoredToken } from '@/lib/auth'
import { withStorageDeadline } from '@/lib/storage-deadline'
import { ClubOnboardingFlow, type OnboardingApi, type SessionStore } from './onboarding-flow'
import { clearGoogleClubDraft, readGoogleClubDraft } from './google-club-draft'
import { SESSION_KEY, parseSavedSession, serializeSession, type Platform } from './onboarding-model'

const options = { timeoutMs: 20000 }
const publicClient = createApiClient({ baseUrl: API_BASE, getToken: () => null })
const bearerClient = createApiClient({ baseUrl: API_BASE, getToken: getStoredToken })

export const onboardingApi: OnboardingApi = {
  post: (path, body) => publicClient.post(path, body, options),
  get: path => publicClient.get(path, options),
  getAuthenticated: path => bearerClient.get(path, options),
}
/** Session id and email only (SecureStore, same backing as the access token). */
export const onboardingStore: SessionStore = {
  async load() { return parseSavedSession(await withStorageDeadline(() => SecureStore.getItemAsync(SESSION_KEY))) },
  save: session => withStorageDeadline(() => SecureStore.setItemAsync(SESSION_KEY, serializeSession(session))),
  clear: () => withStorageDeadline(() => SecureStore.deleteItemAsync(SESSION_KEY)),
}
export const nativePlatform: Platform = NativePlatform.OS === 'ios' ? 'IOS' : 'ANDROID'

export function useClubOnboarding(allowGoogleDraft = true) {
  const [flow] = useState(() => {
    const draft = allowGoogleDraft ? readGoogleClubDraft() : Promise.resolve(null)
    const api: OnboardingApi = {
      ...onboardingApi,
      async post<T>(path: string, body: unknown) {
        const proof = await draft
        return publicClient.post<T>(path, body, proof && path.startsWith('/onboarding/clubs/')
          ? { ...options, headers: { 'X-Onboarding-Continuation': proof.token } } : options)
      },
      async get<T>(path: string) {
        const proof = await draft
        return publicClient.get<T>(path, proof && path.startsWith('/onboarding/clubs/')
          ? { ...options, headers: { 'X-Onboarding-Continuation': proof.token } } : options)
      },
    }
    const store: SessionStore = {
      async load() { const proof = await draft; return proof ? { sessionId: proof.sessionId, email: "" } : onboardingStore.load() },
      async save(session) { if (!await draft) await onboardingStore.save(session) },
      async clear() { if (await draft) await clearGoogleClubDraft(); else await onboardingStore.clear() },
    }
    return new ClubOnboardingFlow({ api, store, platform: nativePlatform, openUrl: url => Linking.openURL(url) })
  })
  const state = useSyncExternalStore(flow.subscribe, () => flow.state)
  return { flow, state }
}
