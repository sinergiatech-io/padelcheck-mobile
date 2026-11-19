import { useState, useSyncExternalStore } from 'react'
import { Linking, Platform as NativePlatform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { createApiClient } from '@/lib/http-client'
import { API_BASE } from '@/lib/constants'
import { getStoredToken } from '@/lib/auth'
import { withStorageDeadline } from '@/lib/storage-deadline'
import { ClubOnboardingFlow, type OnboardingApi, type SessionStore } from './onboarding-flow'
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

export function useClubOnboarding() {
  const [flow] = useState(() => new ClubOnboardingFlow({ api: onboardingApi, store: onboardingStore, platform: nativePlatform, openUrl: url => Linking.openURL(url) }))
  const state = useSyncExternalStore(flow.subscribe, () => flow.state)
  return { flow, state }
}
