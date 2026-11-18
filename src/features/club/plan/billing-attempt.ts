import * as SecureStore from 'expo-secure-store'
import { withStorageDeadline } from '@/lib/storage-deadline'
import { billingAttempt, readBillingAttempt, type BillingAttempt } from './plan-model'

const KEY = 'padelcheck_billing_attempt'

export async function saveBillingAttempt(userId: string, clubId: string, reference: string): Promise<void> {
  const attempt = billingAttempt(userId, clubId, reference)
  if (!attempt) return
  await withStorageDeadline(() => SecureStore.setItemAsync(KEY, JSON.stringify(attempt)))
}

export async function loadBillingAttempt(userId: string, clubId: string): Promise<string | null> {
  const raw = await withStorageDeadline(() => SecureStore.getItemAsync(KEY))
  if (!raw) return null
  try {
    return readBillingAttempt(JSON.parse(raw) as BillingAttempt, userId, clubId)
  } catch {
    return null
  }
}

export async function clearBillingAttempt(): Promise<void> {
  await withStorageDeadline(() => SecureStore.deleteItemAsync(KEY))
}
