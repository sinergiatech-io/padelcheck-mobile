import { useRef, useState, type ReactNode } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, type Href } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { SvgUri, SvgXml } from 'react-native-svg'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { StartupReady } from '@/features/startup/StartupReady'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { venueIcons } from '../venues/venue-icons'

/** Shared chrome of the club event screens (list, hub, wizard and category screens). */
export const eventIcons = {
  hubMenu: Image.resolveAssetSource(require('@/assets/club-events/hub-menu.svg')),
  hubEmpty: Image.resolveAssetSource(require('@/assets/club-events/hub-empty.svg')),
  hubCalendarNotice: Image.resolveAssetSource(require('@/assets/club-events/hub-calendar-notice.svg')),
  hubCancelled: Image.resolveAssetSource(require('@/assets/club-events/hub-cancelled.svg')),
  menuOpen: Image.resolveAssetSource(require('@/assets/club-events/menu-open.svg')),
  menuPublish: Image.resolveAssetSource(require('@/assets/club-events/menu-publish.svg')),
  menuEdit: Image.resolveAssetSource(require('@/assets/club-events/menu-edit.svg')),
  menuCancel: Image.resolveAssetSource(require('@/assets/club-events/menu-cancel.svg')),
  modalClose: Image.resolveAssetSource(require('@/assets/club-events/modal-close.svg')),
  listPin: Image.resolveAssetSource(require('@/assets/club-events/list-pin.svg')),
  listDate: Image.resolveAssetSource(require('@/assets/club-events/list-date.svg')),
  listArrow: Image.resolveAssetSource(require('@/assets/club-events/list-arrow.svg')),
  hubPin: Image.resolveAssetSource(require('@/assets/club-events/hub-pin.svg')),
  hubDate: Image.resolveAssetSource(require('@/assets/club-events/hub-date.svg')),
  hubPrice: Image.resolveAssetSource(require('@/assets/club-events/hub-price.svg')),
}
export const ROOT = '/club/events'
export const replace = (path: string) => router.replace(path as Href)
export const push = (path: string) => router.push(path as Href)
export function Icon({ name }: { name: keyof typeof venueIcons }) {
  const { xml, width, height } = venueIcons[name]
  return <SvgXml xml={xml} width={width} height={height} />
}
export function EventIcon({ name }: { name: keyof typeof eventIcons }) {
  const size = name === 'hubCalendarNotice' || name === 'hubCancelled' ? 20 : 24
  return <SvgUri uri={eventIcons[name]?.uri ?? null} width={size} height={size} />
}
export function Copy({ children, strong = false, small = false, muted = false }: {
  children: ReactNode; strong?: boolean; small?: boolean; muted?: boolean
}) {
  return <Text className={strong ? 'font-inter-600' : 'font-sans'}
    style={[s.copy, strong && s.strong, small && s.small, muted && s.muted]}>{children}</Text>
}
export function Shell({ title, children, footer, back, headerAction, hub = false, wizard = false, refresh }: {
  title: string; children: ReactNode; footer?: ReactNode; back?: () => void; headerAction?: ReactNode; hub?: boolean; wizard?: boolean
  refresh?: { refreshing: boolean; onRefresh: () => void }
}) {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const initials = [user?.firstName, user?.lastName].map(name => name?.[0] ?? '').join('')
  const contentStyle = [s.content, hub && s.hubContent, wizard && s.wizardContent]
  return <StartupReady><SafeAreaView edges={['top']} style={s.safe}><StatusBar style="light" />
    <KeyboardAvoidingView style={[s.body, wizard && s.wizardBody]} behavior={wizard && Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        {back && <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={back} style={s.iconButton}><Icon name="back" /></Pressable>}
        <Text accessibilityRole="header" className="font-inter-700" numberOfLines={1} style={s.heading}>{title}</Text>
        {headerAction}
        {!back && initials !== '' && <View style={s.avatar}><Copy small>{initials}</Copy></View>}
      </View>
      {refresh ? <RefreshableScrollView style={s.scroll} contentContainerStyle={contentStyle} alwaysBounceVertical
        keyboardShouldPersistTaps="handled" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>{children}</RefreshableScrollView>
        : <ScrollView style={s.scroll} contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">{children}</ScrollView>}
      {footer && <View style={[s.footer, wizard && { paddingBottom: Math.max(24, insets.bottom) }]}>{footer}</View>}
      {!wizard && <ClubBottomNav selectedLabel="Eventos" onDashboard={() => replace('/dashboard')}
        onClub={() => replace('/club/settings')} bottomInset={insets.bottom} />}
    </KeyboardAvoidingView>
  </SafeAreaView></StartupReady>
}
export function useManualRefresh(refetch: () => Promise<unknown>) {
  const pending = useRef(false)
  const [refreshing, setRefreshing] = useState(false)
  async function refresh() {
    if (pending.current) return
    pending.current = true
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      pending.current = false
      setRefreshing(false)
    }
  }
  return { refreshing, onRefresh: () => void refresh() }
}
export function Notice({ children, error = false, success = false }: { children: ReactNode; error?: boolean; success?: boolean }) {
  return <View accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite"
    style={[s.notice, error ? s.error : success ? s.success : s.warning]}>
    <Icon name={error ? 'error' : success ? 'check' : 'info'} /><View style={s.flex}><Copy>{children}</Copy></View>
  </View>
}
export function Retry({ children, retry }: { children: ReactNode; retry: () => void }) {
  return <View style={s.gap}><Notice error>{children}</Notice>
    <Button variant="secondary" style={s.soft} onPress={retry}>Reintentar</Button></View>
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <View style={{ gap: 8 }}><Text className="font-inter-500" style={s.copy}>{label} <Text style={s.dangerText}>*</Text></Text>{children}</View>
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#120f18' },
  body: { flex: 1, backgroundColor: '#f6f6f6' },
  wizardBody: { backgroundColor: '#fefefe' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#120f18', height: 56, gap: 8, paddingHorizontal: 16 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#c9cf38', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  heading: { color: '#fefefe', fontSize: 20, lineHeight: 28, flex: 1 },
  iconButton: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: 16, paddingHorizontal: 16, paddingVertical: 24 },
  hubContent: { gap: 28, paddingTop: 20 },
  hubGap: { gap: 28 },
  hubSkeleton: { height: 160, borderRadius: 16, backgroundColor: '#dedede' },
  more: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  hubSummary: { padding: 15, gap: 10 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  hubWarning: { borderColor: '#ffdca8', backgroundColor: '#fcf4e6' },
  hubNeutral: { borderColor: '#e7e7e8', backgroundColor: '#f6f6f6' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 18, lineHeight: 28, color: '#120f18' },
  categoriesEmpty: { alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#dedde0', backgroundColor: '#fefefe', borderRadius: 16, padding: 8 },
  categoryHint: { maxWidth: 192, fontSize: 12, lineHeight: 16, color: '#605e64' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#120f1866' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#fefefe', paddingHorizontal: 20, paddingTop: 8 },
  handle: { alignSelf: 'center', height: 4, width: 36, borderRadius: 4, backgroundColor: '#c4c3c7', marginBottom: 16 },
  menuAction: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 62 },
  menuDivider: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e7e7e8', paddingTop: 8 },
  wizardContent: { paddingHorizontal: 32 },
  footer: { paddingHorizontal: 32, paddingBottom: 24, paddingTop: 16 },
  button: { height: 48, borderRadius: 8 },
  soft: { height: 48, borderRadius: 8, borderWidth: 0, backgroundColor: '#f8f8e9' },
  danger: { height: 48, borderRadius: 8, borderWidth: 0, backgroundColor: '#fdecec' },
  dangerText: { color: '#b51e15' },
  copy: { color: '#120f18', fontSize: 14, lineHeight: 20 },
  strong: { color: '#120f18', fontSize: 16, lineHeight: 24 },
  small: { fontSize: 12, lineHeight: 16 },
  muted: { color: '#605e64' },
  search: { height: 40, borderRadius: 16, borderWidth: 1, borderColor: '#b6b5b7', backgroundColor: '#fefefe', paddingLeft: 47, paddingRight: 16, fontSize: 14 },
  searchIcon: { position: 'absolute', left: 16, top: 8 },
  field: { height: 56, borderRadius: 8, borderWidth: 1, borderColor: '#929195', backgroundColor: '#fefefe', paddingHorizontal: 16, fontSize: 14 },
  gap: { gap: 12 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  flex: { flex: 1 },
  skeleton: { height: 259, borderRadius: 16, backgroundColor: '#dedede' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 16 },
  eventCard: { borderWidth: 1, borderColor: '#e7e7e8', borderRadius: 16, backgroundColor: '#fefefe', overflow: 'hidden' },
  cover: { height: 110, alignItems: 'flex-end', padding: 12 },
  badge: { borderRadius: 8, backgroundColor: '#dedde0', paddingHorizontal: 8, paddingVertical: 4 },
  openBadge: { backgroundColor: '#c9cf38' },
  eventContent: { gap: 4, paddingHorizontal: 16, paddingVertical: 8 },
  edit: { height: 40, width: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5e7' },
  linkRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', alignItems: 'center', minHeight: 32, marginTop: 8 },
  link: { color: '#6b7009', fontSize: 14, lineHeight: 20 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 12, borderRadius: 8 },
  info: { borderColor: '#c2d8fc', backgroundColor: '#ebf3fe' },
  warning: { borderColor: '#ffdca8', backgroundColor: '#fff5e7' },
  error: { borderColor: '#fac5c5', backgroundColor: '#fdecec' },
  success: { borderColor: '#baedcd', backgroundColor: '#e9f9ef' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8, backgroundColor: '#0006' },
  dialog: { width: '100%', maxWidth: 374, borderRadius: 16, backgroundColor: '#fefefe', overflow: 'hidden' },
  dialogHeader: { minHeight: 52, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e7e7e8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dialogContent: { gap: 16, padding: 16 },
  choice: { flexDirection: 'row', minHeight: 56, alignItems: 'center', gap: 24, paddingHorizontal: 16 },
  radio: { minHeight: 64, borderRadius: 12, paddingLeft: 12, paddingRight: 30, backgroundColor: '#fdfdfc' },
  selected: { backgroundColor: '#f8f8e9' },
  circle: { borderRadius: 10, width: 20, height: 20, borderWidth: 2, borderColor: '#605e64', alignItems: 'center', justifyContent: 'center' },
  activeCircle: { borderColor: '#a9b12b' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#a9b12b' },
  checkbox: { width: 18, height: 18, borderWidth: 2, borderRadius: 2, borderColor: '#605e64', alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: '#a9b12b', borderColor: '#a9b12b' },
  check: { color: '#fff', fontWeight: 'bold', fontSize: 13, lineHeight: 14 },
  venue: { padding: 12, borderRadius: 16, backgroundColor: '#f6f7f8' },
})
