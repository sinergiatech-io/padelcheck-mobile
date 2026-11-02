export const STORAGE_TIMEOUT_MS = 5_000

export class StorageUnavailableError extends Error {
  constructor() { super('Local session storage is unavailable'); this.name = 'StorageUnavailableError' }
}

/** Native storage cannot be cancelled; late completions never authorize the session. */
export function withStorageDeadline<T>(operation: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new StorageUnavailableError()), STORAGE_TIMEOUT_MS)
    Promise.resolve().then(operation).then(
      value => { clearTimeout(timer); resolve(value) },
      () => { clearTimeout(timer); reject(new StorageUnavailableError()) },
    )
  })
}
