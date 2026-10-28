import { Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const HEADER_BG = '#120F18'

export function LocationMobileHeader() {
  const insets = useSafeAreaInsets()
  const statusBarFallback = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0
  const topInset = Math.max(insets.top, statusBarFallback)

  return (
    <View style={styles.headerRoot}>
      <StatusBar style="light" />
      <View style={[styles.statusFill, { height: topInset }]} />
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          className="h-10 w-10 items-center justify-center"
          onPress={() => router.back()}
        >
          <ArrowBackIcon size={22} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 font-inter-700 text-h3 text-surface" numberOfLines={1}>
          Ubicacion
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
