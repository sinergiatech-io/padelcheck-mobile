import { useEffect, useState } from 'react'
import { Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { eventsMockService } from '@/features/events/api/events.mock'

/** Mismo token que `dark-900` — color sólido inline para que Android pinte bien bajo la status bar. */
const HEADER_BG = '#120F18'

type EventMobileHeaderProps = {
  eventId: string
  /** Destino del botón volver. Por defecto: listado de eventos. */
  backHref?: string
}

export function EventMobileHeader({ eventId, backHref = '/events' }: EventMobileHeaderProps) {
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState<string>('')

  useEffect(() => {
    eventsMockService.getEvent(eventId).then((event) => setTitle(event?.title ?? ''))
  }, [eventId])

  const statusBarFallback = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0
  const topInset = Math.max(insets.top, statusBarFallback)

  return (
    <View style={styles.headerRoot}>
      <StatusBar style="light" />
      {/* Relleno explícito: el paddingTop + className a veces deja franja negra del window detrás de la status bar */}
      <View style={[styles.statusFill, { height: topInset }]} />
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          className="h-10 w-10 items-center justify-center"
          onPress={() => {
            if (router.canGoBack()) {
              router.back()
              return
            }
            router.replace(backHref)
          }}
        >
          <ArrowBackIcon size={22} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 font-inter-600 text-h3 text-surface" numberOfLines={1}>
          {title || '…'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  headerRoot: {
    backgroundColor: HEADER_BG,
  },
  statusFill: {
    backgroundColor: HEADER_BG,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: HEADER_BG,
  },
})
