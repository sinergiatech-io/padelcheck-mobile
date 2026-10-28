import { Platform, StatusBar as RNStatusBar, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const HEADER_BG = '#120F18'

export function EventsListMobileHeader() {
  const insets = useSafeAreaInsets()
  const statusBarFallback = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0
  const topInset = Math.max(insets.top, statusBarFallback)

  return (
    <View style={styles.headerRoot}>
      <StatusBar style="light" />
      <View style={[styles.statusFill, { height: topInset }]} />
      <View style={styles.row}>
        <Text className="font-inter-700 text-h3 text-surface">Eventos</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: HEADER_BG,
  },
})
