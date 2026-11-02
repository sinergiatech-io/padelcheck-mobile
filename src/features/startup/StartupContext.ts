import { createContext, useContext } from 'react'

export const StartupContext = createContext({ attempt: 0, markReady: () => {}, fail: () => {} })
export function useStartup() { return useContext(StartupContext) }
