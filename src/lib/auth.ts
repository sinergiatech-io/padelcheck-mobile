import * as SecureStore from 'expo-secure-store'
import { withStorageDeadline } from './storage-deadline'

const TOKEN_KEY = 'padelcheck_token'

export function getStoredToken(): Promise<string | null> {
  return withStorageDeadline(() => SecureStore.getItemAsync(TOKEN_KEY))
}

export function setStoredToken(token: string): Promise<void> {
  return withStorageDeadline(() => SecureStore.setItemAsync(TOKEN_KEY, token))
}

export function clearStoredToken(): Promise<void> {
  return withStorageDeadline(() => SecureStore.deleteItemAsync(TOKEN_KEY))
}
