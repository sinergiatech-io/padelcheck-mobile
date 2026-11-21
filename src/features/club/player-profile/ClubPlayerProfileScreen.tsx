import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, BackHandler, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Redirect, router, useLocalSearchParams, usePreventRemove } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { SvgUri } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { useRefreshControl } from '@/hooks/use-refresh-control'
import { useAuth } from '@/context/AuthContext'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { StartupReady } from '@/features/startup/StartupReady'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { activityMonth, futureNotice, profileError, useClubPlayerProfile, type ClubPlayerProfile } from './use-club-player-profile'

const playedIcon = Image.resolveAssetSource(require('@/assets/player-profile/matches-played.svg'))?.uri
const wonIcon = Image.resolveAssetSource(require('@/assets/player-profile/matches-won.svg'))?.uri
const emptyActivityIcon = Image.resolveAssetSource(require('@/assets/player-profile/empty-activity.svg'))?.uri
const body = 'font-inter-400 text-[14px] leading-[20px] text-dark-900'
const caption = 'font-inter-400 text-[12px] leading-[16px] text-[#605e64]'
const label = 'font-inter-600 text-[14px] leading-[20px] text-dark-900'
const button = 'h-[48px] rounded-[8px]'
const stack = { gap: 12 }

function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <View accessibilityLiveRegion="polite" className={`rounded-lg p-3 ${error ? 'bg-[#fdecec]' : 'bg-[#f8f8e9]'}`}>
    <Text accessibilityRole={error ? 'alert' : undefined} className={body}>{children}</Text>
  </View>
}

function Identity({ player }: { player: ClubPlayerProfile }) {
  const name = [player.firstName, player.lastName].filter(Boolean).join(' ')
  const initials = [player.firstName, player.lastName].map(part => part?.charAt(0)).join('')
  const branch = player.gender === 'MALE' ? 'Caballeros' : player.gender === 'FEMALE' ? 'Damas' : ''
  return <View style={{ gap: 12, padding: 16, borderRadius: 20 }} className="bg-[#f8f8e9]">
    <View className="flex-row" style={{ gap: 12 }}>
      {player.profilePhotoUrl
        ? <Image accessible={false} style={{ width: 64, height: 64, borderRadius: 32 }} source={{ uri: player.profilePhotoUrl }} />
        : <View accessible={false} style={{ width: 64, height: 64, borderRadius: 32 }} className="items-center justify-center bg-primary-500">
          <Text className="font-inter-700 text-[24px] leading-[32px] text-white">{initials}</Text>
        </View>}
      <View className="flex-1">
        <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32 }} className="font-inter-700 text-dark-900">{name}</Text>
        {Boolean(player.city) && <Text className={caption}>{player.city}</Text>}
      </View>
    </View>
    <View className="items-start" style={{ gap: 4 }}>
      <Text className={caption}>Categoría global</Text>
      <Text className={`${label} rounded-full bg-white px-2.5 py-0.5`}>
        {player.globalCategory ? [player.globalCategory.name, branch].filter(Boolean).join(' ') : 'Sin categoría'}
      </Text>
    </View>
  </View>
}

function Activity({ entries }: { entries: ClubPlayerProfile['recentActivity'] }) {
  if (!entries.length) return <Text className={body}>Sin participaciones en este club.</Text>
  return <View style={{ gap: 20 }}>
    {entries.map((entry, index) => <View key={`${entry.eventId}-${index}`}>
      <Text className={label}>{entry.eventName}</Text>
      <Text className={caption}>{entry.divisionName} · {activityMonth(entry.startDate)}</Text>
    </View>)}
  </View>
}

export function ClubPlayerProfileScreen() {
  const { user, destination, phase } = useAuth()
  const { playerId, fromClubPlayers } = useLocalSearchParams<{ playerId: string; fromClubPlayers?: string }>()
  if (phase === 'checking') return <ActivityIndicator accessibilityLabel="Validando sesión" />
  if (phase === 'unverified') return <SessionUnverified />
  if (phase !== 'ready') return <Redirect href="/login" />
  if (destination?.kind !== 'club' || !playerId || !user) return <Redirect href="/events" />
  return <StartupReady>
    <Profile key={`${user.userId}:${destination.clubId}:${playerId}`} clubId={destination.clubId} playerId={playerId}
      accountId={user.userId} linkedFromList={fromClubPlayers === '1'} />
  </StartupReady>
}

function Profile({ clubId, playerId, accountId, linkedFromList }: {
  clubId: string; playerId: string; accountId: string; linkedFromList: boolean
}) {
  const flow = useClubPlayerProfile(clubId, playerId, accountId)
  const { data: player, view, open, saving, dirty } = flow
  const insets = useSafeAreaInsets()
  const [choosing, setChoosing] = useState(false)
  const refreshRunning = useRef(false)
  const refresh = useRefreshControl(async () => { await flow.profile.refetch({ cancelRefetch: false }) })

  async function reloadProfile() {
    if (refreshRunning.current || flow.profile.isFetching || saving || view !== 'profile') return
    refreshRunning.current = true
    try { await refresh.onRefresh() } finally { refreshRunning.current = false }
  }

  function confirmDiscard(leave: () => void) {
    Alert.alert('¿Descartar los cambios?', 'Tenés cambios sin guardar.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar cambios', style: 'destructive', onPress: leave },
    ])
  }
  usePreventRemove(dirty || saving, ({ repeat }) => { if (!saving) confirmDiscard(repeat) })
  const returnToList = () => {
    if (linkedFromList && router.canGoBack()) router.back()
    else router.replace('/dashboard')
  }
  function back() {
    if (saving) return
    if (view === 'profile') return returnToList()
    if (view === 'confirm-category') return open('category')
    if (dirty) confirmDiscard(() => open('profile'))
    else open('profile')
  }
  useEffect(() => {
    if (view === 'profile') return
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true })
    return () => listener.remove()
  })

  const progressText = view === 'confirm-category' ? 'Guardando categoría…' : view === 'remove' ? 'Quitando observación…'
    : player?.observed ? 'Guardando nota…' : 'Guardando observación…'
  const content = <View style={{ gap: 20 }}>
    {flow.profile.isPending && <ActivityIndicator accessibilityLabel="Cargando ficha" />}
    {flow.profile.isError && <View style={stack}>
      <Notice error>{profileError(flow.profile.error)}</Notice>
      <Button variant="secondary" className={button} onPress={() => void reloadProfile()}>Reintentar</Button>
    </View>}
    {flow.notice && <View accessibilityLiveRegion="polite" className={`rounded-lg p-3 ${flow.notice.error ? 'bg-[#fdecec]' : 'bg-[#e9f9ef]'}`}>
      <Text className={body}>{flow.notice.text}</Text>
    </View>}
    {saving && <View accessibilityLiveRegion="polite" style={{ gap: 12 }} className="flex-row items-center rounded-lg border border-[#c2d8fc] bg-[#ebf3fe] p-3">
      <View className="size-6 items-center justify-center">
        {emptyActivityIcon && <SvgUri uri={emptyActivityIcon} width={20} height={20} />}
      </View>
      <View className="flex-1"><Text className={label}>{progressText}</Text><Text className={caption}>Esperá la respuesta para continuar.</Text></View>
    </View>}
    {player && <>
      {view !== 'history' && <Identity player={player} />}
      {view === 'profile' && <>
        <View style={stack}>
          <View className="flex-row items-center justify-between">
            <Text className={label}>{player.clubName}</Text>
            {player.observed && <Text className={`${caption} rounded-full bg-[#f8f8e9] px-3 py-1`}>Observado</Text>}
          </View>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <Text className="font-inter-700 text-[36px] leading-[44px] text-dark-900">{player.effectiveCategory?.name ?? 'Sin categoría'}</Text>
            <View>
              <Text className={label}>{player.gender === 'MALE' ? 'Caballeros' : player.gender === 'FEMALE' ? 'Damas' : ''}</Text>
              <Text className={caption}>{player.localCategory ? 'Categoría en este club' : 'Usa la categoría global'}</Text>
            </View>
          </View>
          {player.globalCategory && !player.localCategory && <Text className={caption}>Sin categoría local asignada</Text>}
          {player.canManage ? <View className="flex-row" style={{ gap: 10 }}>
            <Button className={`${button} flex-1`} onPress={() => open('category')}>Recategorizar</Button>
            <Button variant="secondary" className={`${button} flex-1 border-[#929096]`} onPress={() => open('observe')}>{player.observed ? 'Editar nota' : 'Observar'}</Button>
          </View> : <Notice>Tenés acceso de solo lectura.</Notice>}
          {player.observed && player.canManage && <View style={{ gap: 8 }} className="items-start">
            <Text className={caption}>Nota interna · Solo este club</Text>
            <Text className={`${body} text-[#605e64]`}>{player.observationNote ?? 'Sin nota interna'}</Text>
            <Button variant="ghost" className={button} onPress={() => open('remove')}>Quitar observación</Button>
          </View>}
        </View>
        <View style={{ padding: 20, gap: 12, borderRadius: 16 }} className="bg-dark-900">
          <Text className="font-inter-600 text-[14px] leading-[20px] text-white">Rendimiento en este club</Text>
          <View className="flex-row" style={{ gap: 16 }}>
            {[{ icon: playedIcon, count: player.matchesPlayed, text: 'Partidos jugados' },
              { icon: wonIcon, count: player.matchesWon, text: 'Partidos ganados' }].map(stat =>
              <View key={stat.text} className="flex-1" style={{ gap: 4 }}>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  {stat.icon && <SvgUri uri={stat.icon} width={20} height={20} />}
                  <Text className="font-inter-600 text-[36px] leading-[44px] text-primary-500">{stat.count}</Text>
                </View>
                <Text className="font-inter-400 text-[12px] leading-[16px] text-white">{stat.text}</Text>
              </View>)}
          </View>
        </View>
        {player.recentActivity.length === 0 ? <View style={{ gap: 12 }} className="flex-row items-center rounded-lg border border-[#c2d8fc] bg-[#ebf3fe] p-3">
          <View className="size-6 items-center justify-center">
            {emptyActivityIcon && <SvgUri uri={emptyActivityIcon} width={20} height={20} />}
          </View>
          <View className="flex-1">
            <Text className={label}>Todavía no tiene actividad</Text>
            <Text className={caption}>{player.canManage
              ? 'Está vinculado al club. Podés recategorizarlo u observarlo sin que haya jugado un torneo.'
              : 'Está vinculado al club y todavía no participó en sus torneos.'}</Text>
          </View>
        </View> : <View style={{ gap: 20 }}>
          <View className="flex-row items-center justify-between">
            <Text className={label}>Torneos en este club</Text>
            {player.recentActivity.length > 0 && <Button variant="link" onPress={() => open('history')}>Ver historial</Button>}
          </View>
          <Activity entries={player.recentActivity} />
        </View>}
      </>}
      {view === 'history' && <>
        {flow.history.isPending ? <ActivityIndicator accessibilityLabel="Cargando historial" />
          : <Activity entries={flow.history.data?.pages.flat() ?? []} />}
        {flow.history.isError && <View style={stack}><Notice error>No pudimos cargar el historial.</Notice>
          <Button variant="link" onPress={() => void flow.history.refetch()}>Reintentar</Button></View>}
        {flow.history.hasNextPage && <Button variant="secondary" className={button} disabled={flow.history.isFetchingNextPage}
          onPress={() => void flow.history.fetchNextPage()}>Cargar más</Button>}
      </>}
      {view !== 'profile' && view !== 'history' && <Text className="font-inter-400 text-[12px] leading-[16px] text-dark-900">{player.clubName} · Categoría actual: {player.effectiveCategory?.name ?? 'Sin categoría'}</Text>}
      {view === 'observe' && <View style={{ gap: 16, paddingTop: 4 }}>
        <Text accessibilityRole="header" className="font-inter-600 text-[18px] leading-[26px] text-dark-900">{player.observed ? 'Editá la nota de observación' : 'Observar para un posible ascenso'}</Text>
        <Text className="font-inter-500 text-[14px] leading-[20px] text-dark-900">Marcá al jugador mientras esperás un resultado deportivo. Su categoría no cambia.</Text>
        <Text className={label}>Nota interna (opcional)</Text>
        <View style={{ paddingHorizontal: 16 }} className={`rounded-[8px] border border-[#929096] ${saving ? 'bg-[#f5f5f5]' : ''}`}>
          <TextInput accessibilityLabel="Nota interna (opcional)" multiline editable={!saving} value={flow.note} onChangeText={flow.setNote}
            placeholder="Agregá una nota si lo necesitás" placeholderTextColor="#605e64" textAlignVertical="top"
            underlineColorAndroid="transparent" style={{ minHeight: 54, paddingHorizontal: 0, paddingVertical: 12 }}
            className={body} />
        </View>
        <Text className={caption}>Solo el administrador y el staff autorizados de este club pueden ver la nota.</Text>
        <Text className="font-inter-400 text-[12px] leading-[16px] text-dark-900">La marca será visible para el jugador.</Text>
      </View>}
      {view === 'category' && <View style={stack}>
        <Text accessibilityRole="header" className="font-inter-700 text-xl text-dark-900">Elegí su nueva categoría</Text>
        <Text className={label}>Nueva categoría en este club</Text>
        {flow.catalog.isPending ? <ActivityIndicator accessibilityLabel="Cargando catálogo" /> : flow.catalog.isError
          ? <View style={stack}><Notice error>No pudimos cargar las categorías.</Notice>
            <Button variant="link" onPress={() => void flow.catalog.refetch()}>Reintentar</Button></View>
          : !flow.catalog.data?.length ? <Notice>No hay categorías disponibles.</Notice>
          : <Button variant="secondary" className={button} onPress={() => setChoosing(true)}>{flow.selected?.name ?? 'Seleccioná una categoría'}</Button>}
        <Text className={body}>{futureNotice}</Text>
        {player.localCategory && <Text className={body}>La categoría local puede cambiarse por otra, pero no quitarse.</Text>}
      </View>}
      {view === 'confirm-category' && <View style={stack}>
        <Text accessibilityRole="header" className="font-inter-700 text-xl text-dark-900">Categoría en este club</Text>
        <Text className="font-inter-600 text-lg text-dark-900">{player.effectiveCategory?.name ?? 'Sin categoría'} → {flow.selected?.name}</Text>
        <Text className={body}>{futureNotice}</Text>
        {flow.clearsObservation && <Notice>Al guardar este cambio se eliminarán la marca de observado y la nota interna de este club.</Notice>}
      </View>}
      {view === 'remove' && <View style={stack}>
        <Text accessibilityRole="header" className="font-inter-700 text-xl text-dark-900">¿Quitar la observación?</Text>
        <Text className={body}>Se quitará la marca y se borrará la nota interna. La categoría y las inscripciones del jugador no cambian.</Text>
        <Notice>Si volvés a observarlo, la nota anterior no se recuperará.</Notice>
      </View>}
    </>}
  </View>

  const saveText = view === 'confirm-category' ? 'Guardar categoría' : view === 'remove' ? 'Quitar observación'
    : player?.observed ? 'Guardar nota' : 'Guardar observación'
  const footer = player?.canManage && (view === 'category' || view === 'confirm-category' || view === 'remove' || view === 'observe')
  return <SafeAreaView edges={['top']} className="flex-1 bg-[#100e16]">
    <StatusBar style="light" />
    <View className="flex-1 bg-[#fefefe]">
      <View style={{ height: 56, paddingHorizontal: 16 }} className="flex-row items-center bg-[#100e16]">
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" disabled={saving} onPress={back}
          style={{ height: 44, width: 40, opacity: saving ? 0.4 : 1 }} className="items-center justify-center"><ArrowBackIcon /></Pressable>
        <Text accessibilityRole="header" className="font-inter-700 text-[20px] leading-[28px] text-white">{flow.title}</Text>
      </View>
      {view === 'profile' ? <RefreshableScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1, padding: 16, paddingTop: 20 }}
        alwaysBounceVertical refreshing={refresh.refreshing} onRefresh={() => void reloadProfile()}>{content}</RefreshableScrollView>
        : <ScrollView key={view} className="flex-1" contentContainerStyle={{ padding: 16, paddingTop: 20 }}
          keyboardShouldPersistTaps="handled">{content}</ScrollView>}
      {footer && <View className="flex-row bg-[#f2f2f2] px-4 pb-6 pt-4" style={{ gap: 10 }}>
        {(view === 'confirm-category' || view === 'remove') && <Button variant="secondary" className={`${button} flex-1`} disabled={saving} onPress={back}>Cancelar</Button>}
        <Button className={`${button} flex-1 ${saving ? 'bg-[#eef0c1] disabled:opacity-100' : ''}`}
          loading={saving} loadingLabel={`${saveText} en curso`}
          disabled={(view === 'category' || view === 'confirm-category') && !flow.validCategory}
          onPress={() => view === 'category' ? open('confirm-category') : void flow.save()}>{view === 'category' ? 'Continuar' : saveText}</Button>
      </View>}
      <View style={{ opacity: saving ? 0.38 : 1 }}>
        <ClubBottomNav selectedLabel="Jugadores" bottomInset={insets.bottom} busy={saving} onPlayers={returnToList}
          onDashboard={() => router.replace('/dashboard')} onClub={() => router.replace('/club/settings')} />
      </View>
    </View>
    <Modal visible={choosing} transparent animationType="none" onRequestClose={() => setChoosing(false)}>
      <View className="flex-1 justify-center bg-black/40 p-6">
        <View accessibilityViewIsModal className="rounded-xl bg-white p-4">
          <Text accessibilityRole="header" className="mb-3 font-inter-700 text-xl text-dark-900">Nueva categoría</Text>
          <ScrollView style={{ flexGrow: 0, maxHeight: 360 }}>
            {flow.catalog.data?.map(category => <Pressable key={category.id} accessibilityRole="radio"
              accessibilityState={{ checked: category.id === flow.categoryId }} className="min-h-11 justify-center border-b border-[#e7e7e8] px-2"
              onPress={() => { flow.setCategoryId(category.id); setChoosing(false) }}>
              <Text className={label}>{category.name}</Text>
            </Pressable>)}
          </ScrollView>
          <Button variant="secondary" className={`${button} mt-3`} onPress={() => setChoosing(false)}>Cancelar</Button>
        </View>
      </View>
    </Modal>
  </SafeAreaView>
}
