import { useEffect, useRef, useState, type ComponentRef } from 'react'
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SvgUri } from 'react-native-svg'
import { Redirect, router, usePreventRemove } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Button } from '@/components/ui/button'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { useAuth } from '@/context/AuthContext'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { EFFECTIVE_HELP, TYPE_HELP, example, optionLabel } from './category-policy'
import { useCategoryPolicy } from './use-category-policy'

const icons = {
  chevron: Image.resolveAssetSource(require('@/assets/category-policy/chevron.svg'))?.uri ?? '',
  check: Image.resolveAssetSource(require('@/assets/category-policy/check.svg'))?.uri ?? '',
  error: Image.resolveAssetSource(require('@/assets/category-policy/error.svg'))?.uri ?? '',
}
function PolicyNotice({ title, detail, error = false }: { title: string; detail?: string; error?: boolean }) {
  return <View accessibilityLiveRegion="polite" style={{ gap: 12, padding: 12, borderRadius: 8 }} className={`flex-row items-center border ${error ? 'border-[#fac5c5] bg-[#fdecec]' : 'border-[#baedcd] bg-[#e9f9ef]'}`}>
    <SvgUri uri={error ? icons.error : icons.check} width={20} height={20} />
    <View className="flex-1"><Text accessibilityRole={error ? 'alert' : undefined} style={styles.label} className="font-inter-600">{title}</Text>{detail && <Text style={[styles.caption, { marginTop: 2 }]} className="font-inter-400 text-[#605e64]">{detail}</Text>}</View>
  </View>
}

export function CategoryPolicyScreen() {
  const { user, destination, phase } = useAuth()
  const insets = useSafeAreaInsets()
  const context = destination?.kind === 'club'
    ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  const authorized = phase === 'ready' && Boolean(context?.permissions?.includes('MANAGE_CLUB_SETTINGS'))
  const policy = useCategoryPolicy(authorized ? context?.clubId ?? null : null)
  const [options, setOptions] = useState(false)
  const [menuTop, setMenuTop] = useState(0)
  const selector = useRef<ComponentRef<typeof View>>(null)
  const { height } = useWindowDimensions()
  const pendingExit = useRef<(() => void) | null>(null)
  const confirmExit = (repeat: () => void) => Alert.alert('¿Descartar los cambios?', 'Tenés cambios sin guardar.', [
    { text: 'Seguir editando', style: 'cancel' },
    { text: 'Descartar cambios', style: 'destructive', onPress: () => { policy.discard(); repeat() } },
  ])
  usePreventRemove(phase === 'ready' && (policy.dirty || policy.saving), ({ repeat }) => {
    if (policy.saving) pendingExit.current = repeat
    else confirmExit(repeat)
  })
  useEffect(() => {
    if (phase !== 'ready') { pendingExit.current = null; return }
    if (policy.saving || !pendingExit.current) return
    const repeat = pendingExit.current
    pendingExit.current = null
    if (policy.dirty) confirmExit(repeat)
    else repeat()
    // The deferred exit is resolved with the latest persisted result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, policy.saving, policy.dirty])

  if (phase === 'checking') return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator accessibilityLabel="Validando sesión" /></View>
  if (phase === 'unverified') return <SessionUnverified />
  if (phase !== 'ready') return <Redirect href="/login" />
  if (destination?.kind !== 'club') return <Redirect href="/events" />
  const back = () => router.replace('/dashboard')
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#100e16]">
      <StatusBar style="light" />
      <View className="flex-1 bg-background">
        <View style={{ height: 56, paddingHorizontal: 16 }} className="flex-row items-center bg-[#100e16]">
          <Pressable accessibilityRole="button" accessibilityLabel="Volver a Mi Club" disabled={policy.saving} onPress={back} style={{ height: 44, width: 40 }} className="items-center justify-center"><ArrowBackIcon /></Pressable>
          <Text accessibilityRole="header" style={{ fontSize: 20, lineHeight: 28 }} className="font-inter-700 text-white">Reglas de categorías</Text>
        </View>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 24 }}>
          {!authorized ? <Text accessibilityRole="alert" style={styles.label} className="font-inter-400 text-dark-900">No tenés permiso para gestionar la configuración de este club.</Text> : policy.loading ? (
            <View accessibilityLiveRegion="polite" style={{ gap: 12 }}><ActivityIndicator color="#120F18" /><Text style={styles.label} className="font-inter-400">Cargando reglas de categorías…</Text></View>
          ) : policy.loadError ? (
            <PolicyNotice error title="No pudimos cargar la política" detail="Reintentá para consultar la configuración actual de tu club." />
          ) : <>
            {policy.result && <PolicyNotice error={policy.result === 'error'} title={policy.result === 'success' ? 'Cambios guardados' : 'No pudimos guardar los cambios'} detail={policy.result === 'error' ? 'Intentá nuevamente. Conservamos tu selección.' : undefined} />}
            <View style={{ gap: 12, padding: 16, borderRadius: 12 }} className="bg-[#fefefe]">
              <View style={{ gap: 8 }}>
              <Text style={styles.label} className="font-inter-500 text-dark-900">Categorías superiores permitidas</Text>
              <Pressable ref={selector} accessibilityRole="button" accessibilityLabel={`Categorías superiores permitidas, ${optionLabel(policy.draft)}`} accessibilityState={{ expanded: options, disabled: policy.saving }} disabled={policy.saving} onPress={() => selector.current?.measureInWindow((_x, y, _width, measuredHeight) => { setMenuTop(y + measuredHeight + 4); setOptions(true) })} style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 }} className="flex-row items-center justify-between border border-[#929195]">
                <Text style={styles.label} className="font-inter-500 text-dark-900">{optionLabel(policy.draft)}</Text>
                <SvgUri uri={icons.chevron} width={24} height={24} />
              </Pressable>
              </View>
              <Text accessibilityLiveRegion="polite" style={styles.label} className="font-inter-500 text-dark-900">{example(policy.categories, policy.draft)}</Text>
              <Text style={styles.caption} className="font-inter-400 text-dark-900">{EFFECTIVE_HELP}</Text>
            </View>
            <View style={{ gap: 8 }}>
              <Text accessibilityRole="header" style={styles.label} className="font-inter-600 text-dark-900">Catálogo global · Solo lectura</Text>
              <Text style={styles.label} className="font-inter-500 text-dark-900">{policy.categories.map(c => c.name).join(' · ')}</Text>
            </View>
            <Text style={styles.label} className="font-inter-500 text-dark-900">{TYPE_HELP}</Text>
          </>}
        </ScrollView>
        {authorized && !policy.loading && <View style={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16 }}>
          {policy.loadError ? <Button accessibilityLabel="Reintentar" style={{ height: 48, borderRadius: 8 }} onPress={() => void policy.reload()}><Text style={styles.label} className="font-inter-500">Reintentar</Text></Button> :
          <Button accessibilityLabel="Guardar cambios" style={{ height: 48, borderRadius: 8 }} className={`disabled:opacity-100 ${!policy.dirty && !policy.saving ? 'bg-[#eef0c1]' : ''}`} loading={policy.saving} loadingLabel="Guardando…" disabled={!policy.dirty} onPress={() => void policy.save()}><Text style={[styles.label, { color: !policy.dirty ? '#605e64' : '#120f18' }]} className="font-inter-500">Guardar cambios</Text></Button>}
        </View>}
        {/* KAN-134 integrates the full global menu with this return contract. */}
        <View style={{ paddingBottom: insets.bottom }} className="bg-dark-900">
          <Pressable accessibilityRole="button" accessibilityLabel="Volver a Mi Club" onPress={back} disabled={policy.saving} style={{ height: 64 }} className="items-center justify-center"><Text style={styles.caption} className="font-inter-400 text-primary-500">Mi Club</Text></Pressable>
        </View>
      </View>
      <Modal transparent statusBarTranslucent navigationBarTranslucent visible={options} animationType="none" onRequestClose={() => setOptions(false)}>
        <Pressable accessibilityLabel="Cerrar opciones" onPress={() => setOptions(false)} className="flex-1" style={{ paddingTop: menuTop, paddingHorizontal: 16 }}>
          <View accessibilityViewIsModal className="border border-divider bg-surface shadow-lg" style={{ borderRadius: 8, maxHeight: Math.max(88, height - menuTop - insets.bottom - 16) }}>
            <ScrollView contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 16 }}>{Array.from({ length: 8 }, (_, count) => <Pressable key={count} accessibilityRole="radio" accessibilityState={{ checked: policy.draft === count }} onPress={() => { policy.select(count); setOptions(false) }} style={{ minHeight: 44, paddingHorizontal: 16, paddingVertical: 8 }} className={`justify-center border-b border-divider ${policy.draft === count ? 'bg-primary-100' : ''}`}>
              <Text style={styles.label} className="font-inter-500 text-dark-900">{optionLabel(count)}</Text>
            </Pressable>)}</ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
})
