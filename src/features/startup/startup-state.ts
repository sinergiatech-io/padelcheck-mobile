export const FONT_TIMEOUT_MS = 5_000
// Storage read (5s), /me token read (5s), /me (10s), cache write (5s).
// The launch bound never replaces the existing /me deadline.
export const STARTUP_TIMEOUT_MS = 30_000

export type StartupPhase = 'preparing' | 'failed' | 'retrying' | 'finished'
export interface StartupState { phase: StartupPhase; attempt: number; failures: number }
export type StartupEvent =
  | { type: 'ready' | 'failed' | 'retry' }
  | { type: 'prepared' | 'retry-failed'; attempt: number }

export const initialStartupState: StartupState = { phase: 'preparing', attempt: 0, failures: 0 }

export function startupReducer(state: StartupState, event: StartupEvent): StartupState {
  if (state.phase === 'finished') return state
  switch (event.type) {
    case 'ready': return state.phase === 'preparing' ? { ...state, phase: 'finished' } : state
    case 'failed': return state.phase === 'preparing' ? { ...state, phase: 'failed', failures: state.failures + 1 } : state
    case 'retry': return state.phase === 'failed' ? { ...state, phase: 'retrying', attempt: state.attempt + 1 } : state
    case 'prepared': return event.attempt === state.attempt && state.phase === 'retrying' ? { ...state, phase: 'preparing' } : state
    case 'retry-failed': return event.attempt === state.attempt && state.phase === 'retrying' ? { ...state, phase: 'failed', failures: state.failures + 1 } : state
  }
}
