import { useCallback, useState, type ReactNode } from 'react'
import { useFocusEffect, usePathname } from 'expo-router'
import { View } from 'react-native'
import { useStartup } from './StartupContext'

/** Only a focused destination with an actual native layout may resolve launch. */
export function StartupReady({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const { attempt, markReady } = useStartup()
  const pathname = usePathname()
  const [laidOut, setLaidOut] = useState(false)
  useFocusEffect(useCallback(() => {
    if (laidOut && enabled) markReady()
  }, [laidOut, enabled, markReady, pathname, attempt]))
  return <View style={{ flex: 1 }} onLayout={() => setLaidOut(true)}>{children}</View>
}
