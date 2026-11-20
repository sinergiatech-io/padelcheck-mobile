
import * as SecureStore from 'expo-secure-store'
import { withStorageDeadline } from '@/lib/storage-deadline'

const key = 'padelcheck.google-club-draft'
export interface GoogleClubDraft { sessionId: string; token: string; expiresAt: number }

export async function rememberGoogleClubDraft(sessionId: string, token: string, duration: number) {
  await withStorageDeadline(() => SecureStore.setItemAsync(key, JSON.stringify({
    sessionId, token, expiresAt: Date.now() + duration * 1000,
  })))
}

export async function readGoogleClubDraft(): Promise<GoogleClubDraft | null> {
  try {
    const raw = await withStorageDeadline(() => SecureStore.getItemAsync(key))
    const value = JSON.parse(raw ?? 'null') as Partial<GoogleClubDraft> | null
    if (typeof value?.sessionId === 'string' && typeof value.token === 'string'
        && typeof value.expiresAt === 'number' && Date.now() < value.expiresAt) {
      return { sessionId: value.sessionId, token: value.token, expiresAt: value.expiresAt }
    }
    if (raw) await clearGoogleClubDraft()
  } catch { /* The normal onboarding flow still works without a draft. */ }
  return null
}

export async function clearGoogleClubDraft() {
  try { await withStorageDeadline(() => SecureStore.deleteItemAsync(key)) } catch { /* Best effort. */ }
}
