import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronDown, Circle, EllipsisVertical, Mail, Pencil, Phone } from 'lucide-react-native'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { TrophyOutlineIcon } from '@/components/icons/TrophyIcon'
import {
  BOTTOM_NAV_ACTIVE_COLOR, BOTTOM_NAV_INACTIVE_COLOR, BOTTOM_NAV_ICON_SIZE,
  BottomNavEventsIcon, BottomNavPlayersIcon, BottomNavProfileIcon, BottomNavTournamentsIcon,
} from '@/components/icons/BottomNavIcons'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useRefreshControl } from '@/hooks/use-refresh-control'
import { API_BASE } from '@/lib/constants'
import { hideProfileOn, resultLabel, usePlayerProfile, useSportingHistory, useTournamentResults } from './profile-api'
import type { OwnProfile, SportingProfile } from './profile-api'

const titleClass = 'font-inter-600 text-[14px] leading-5 text-[#120F18]'
const secondary = 'font-sans text-[13px] leading-5 text-[#605e64]'
const calendarDate = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeZone: 'UTC' })
const month = new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const utcDate = (value: string) => new Date(value + 'T00:00:00Z')
const playerTabs = [
  { path: '/events', label: 'Eventos', Icon: BottomNavEventsIcon },
  { path: '/my-tournaments', label: 'Mis Torneos', Icon: BottomNavTournamentsIcon },
  { path: '/players', label: 'Jugadores', Icon: BottomNavPlayersIcon },
  { path: '/settings', label: 'Perfil', Icon: BottomNavProfileIcon },
] as const

function ProfileBottomNavigation() {
  return <SafeAreaView edges={['bottom']} className="bg-[#120F18]">
    <View className="h-16 flex-row px-2">
      {playerTabs.map(({ path, label, Icon }) => {
        const selected = path === '/players'
        const color = selected ? BOTTOM_NAV_ACTIVE_COLOR : BOTTOM_NAV_INACTIVE_COLOR
        return <Pressable key={path} accessibilityRole="tab" accessibilityState={{ selected }}
          className="flex-1 items-center justify-center gap-1" onPress={() => router.dismissTo(path)}>
          <Icon color={color} size={BOTTOM_NAV_ICON_SIZE} />
          <Text className="font-sans text-xs" style={{ color }}>{label}</Text>
        </Pressable>
      })}
    </View>
  </SafeAreaView>
}

export function ProfileHeader({ title, back, children }: { title: string; back?: () => void; children?: React.ReactNode }) {
  return <SafeAreaView edges={['top']} className="bg-[#120F18]">
    <View className="min-h-14 flex-row items-center gap-3 px-4">
      {back && <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Volver"
        className="h-11 w-10 items-center justify-center"><ArrowBackIcon color="#FFFFFF" size={20} /></Pressable>}
      <Text accessibilityRole="header" className="min-w-0 flex-1 font-inter-700 text-xl leading-7 text-white">{title}</Text>
      {children}
    </View>
  </SafeAreaView>
}

export function ProfileError({ onRetry, message = 'No pudimos cargar el perfil.' }: { onRetry: () => void; message?: string }) {
  return <View className="rounded-lg border border-[#e7e7e8] px-4 py-3">
    <Text accessibilityLiveRegion="polite" className={secondary}>{message}</Text>
    <Button variant="ghost" onPress={onRetry}>Reintentar</Button>
  </View>
}

export function ProfileSkeleton() {
  return <View accessibilityLabel="Cargando" className="gap-5">
    {[155, 40, 130].map(height => <View key={height} style={{ height }} className="rounded-2xl bg-[#e7e7e8]" />)}
  </View>
}

export function ProfileAvatar({ profile, preview, size = 64 }: { profile: SportingProfile; preview?: string; size?: number }) {
  const { token } = useAuth()
  const [failedUri, setFailedUri] = useState<string>()
  const path = profile.profilePhotoUrl ?? ''
  const privatePhoto = /^\/players\/[0-9a-f-]{36}\/avatar\/[0-9a-f-]{36}$/i.test(path)
  const source = preview ? { uri: preview } : privatePhoto && token
    ? { uri: API_BASE + path, headers: { Authorization: 'Bearer ' + token }, cache: 'reload' as const }
    : path.startsWith('https://') ? { uri: path } : undefined
  const initials = [profile.firstName, profile.lastName].map(name => name.trim().slice(0, 1)).join('').toUpperCase()
  return <View style={{ height: size, width: size }} className="shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C9CF38]">
    <Text className="font-inter-700 text-2xl text-white">{initials}</Text>
    {source && source.uri !== failedUri && <Image accessible={false} source={source} resizeMode="cover"
      className="absolute inset-0 h-full w-full" onError={() => setFailedUri(source.uri)} />}
  </View>
}

export function PlayerProfileScreen({ playerId }: { playerId?: string }) {
  const { logout } = useAuth()
  const { saved } = useLocalSearchParams<{ saved?: string }>()
  const query = usePlayerProfile(playerId)
  const { refreshing, onRefresh } = useRefreshControl(async () => { await query.refetch({ cancelRefetch: false }) })
  const [showCategories, setCategories] = useState(false)
  const [showOptions, setOptions] = useState(false)
  const own = !playerId
  const data = hideProfileOn(query.error) ? undefined : query.data
  const contact = data && 'email' in data ? data as OwnProfile : undefined

  return <View className="flex-1 bg-[#FEFEFE]">
    <ProfileHeader title={own ? 'Perfil' : 'Perfil de jugador'} back={own ? undefined : () => {
      if (router.canGoBack()) router.back()
      else router.replace('/players')
    }}>
      {own && <Pressable accessibilityRole="button" accessibilityLabel="Opciones del perfil"
        accessibilityState={{ expanded: showOptions }} className="h-11 w-11 items-center justify-center"
        onPress={() => setOptions(!showOptions)}><EllipsisVertical size={20} color="#FFFFFF" /></Pressable>}
    </ProfileHeader>
    {showOptions && <View className="absolute right-4 top-24 z-10 rounded-lg border border-[#e7e7e8] bg-white p-1">
      <Button variant="ghost" onPress={() => { setOptions(false); router.push('/profile-settings/security') }}>Seguridad</Button>
      <Button variant="ghost" onPress={() => { setOptions(false); void logout() }}>Cerrar sesión</Button>
    </View>}
    <RefreshableScrollView className="flex-1" alwaysBounceVertical refreshing={refreshing} onRefresh={onRefresh}
      contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 16, flexGrow: 1 }}>
      {saved === '1' && <Text accessibilityLiveRegion="polite" className="rounded-lg bg-[#f8f9e9] p-3 font-sans text-sm">Perfil actualizado</Text>}
      {query.isPending && <ProfileSkeleton />}
      {query.isError && <ProfileError onRetry={() => { void query.refetch() }} />}
      {data && <>
        <View className="relative gap-3 rounded-[20px] bg-[#f8f9e9] p-4">
          <View className={'flex-row items-center gap-3 ' + (own ? 'pr-11' : '')}>
            <ProfileAvatar profile={data} />
            <View className="min-w-0 flex-1">
              <Text accessibilityRole="header" className="font-inter-600 text-2xl leading-8 text-[#120F18]">{data.firstName} {data.lastName}</Text>
              {data.city && <Text className={secondary}>{data.city}</Text>}
            </View>
          </View>
          {own && <Pressable accessibilityRole="button" accessibilityLabel="Editar perfil"
            onPress={() => router.push('/profile-settings/edit')}
            className="absolute right-4 top-4 h-11 w-11 items-center justify-center">
            <Pencil size={18} color="#605e64" />
          </Pressable>}
          <View className="gap-1">
            <Text className={secondary}>Categoría global</Text>
            <Text className={titleClass + ' self-start rounded-full bg-white px-3 py-1'}>
              {data.baseCategoryName ? [data.baseCategoryName, data.gender === 'MALE' ? 'Caballeros' : data.gender === 'FEMALE' ? 'Damas' : ''].filter(Boolean).join(' ') : 'Sin categoría'}
            </Text>
          </View>
          {contact && <View className="gap-1 border-t border-[#dedfd4] pt-3">
            <View className="flex-row items-start gap-2"><Mail size={16} color="#605e64" /><Text className={secondary + ' flex-1'}>{contact.email}</Text></View>
            <View className="flex-row items-start gap-2"><Phone size={16} color="#605e64" /><Text className={secondary + ' flex-1'}>{contact.phone || 'Sin teléfono'}</Text></View>
          </View>}
        </View>
        <View>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showCategories }}
            className="min-h-12 flex-row items-center gap-3"
            onPress={() => setCategories(!showCategories)}>
            <Text className={titleClass + ' flex-1'}>Categorías por club</Text>
            <Text className="font-sans text-xs">{data.clubCategories.length} {data.clubCategories.length === 1 ? 'club' : 'clubes'}</Text>
            <ChevronDown size={16} color="#605e64" />
          </Pressable>
          {showCategories && data.clubCategories.length === 0 && <Text className={secondary}>Sin categorías por club.</Text>}
          {showCategories && data.clubCategories.map(item => <View key={item.clubId} className="flex-row justify-between gap-2 border-b border-[#e7e7e8] py-2">
            <Text className={titleClass + ' flex-1'}>{item.clubName}</Text>
            <Text className={secondary}>{item.categoryName ?? 'Sin categoría'}{own && item.observed ? ' · Observado' : ''}</Text>
          </View>)}
        </View>
        <View className="gap-3 rounded-2xl bg-[#120F18] p-5">
          <Text accessibilityRole="header" className="font-inter-600 text-sm text-white">Rendimiento global · Histórico</Text>
          <View className="flex-row gap-4">
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-2"><Circle size={19} color="#C9CF38" />
                <Text className="font-inter-600 text-4xl text-[#C9CF38]">{data.stats.matchesPlayed}</Text></View>
              <Text className="font-sans text-xs text-white">Partidos jugados</Text>
            </View>
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-2"><TrophyOutlineIcon size={18} />
                <Text className="font-inter-600 text-4xl text-[#C9CF38]">{data.stats.matchesWon}</Text></View>
              <Text className="font-sans text-xs text-white">Partidos ganados</Text>
            </View>
          </View>
        </View>
        <View>
          <View className="flex-row items-center justify-between gap-2">
            <Text accessibilityRole="header" className={titleClass}>Últimos torneos</Text>
            <Pressable accessibilityRole="link" className="min-h-11 justify-center" onPress={() => {
              if (own) router.navigate({ pathname: '/my-tournaments', params: { tab: 'historial' } })
              else router.push({ pathname: '/player/[playerId]/history', params: { playerId } })
            }}><Text className="font-inter-500 text-sm text-[#626700]">Ver historial</Text></Pressable>
          </View>
          {data.recentTournaments.length === 0 && <Text className={secondary + ' py-3'}>Todavía no hay torneos finalizados.</Text>}
          {data.recentTournaments.map(item => <View key={item.eventId + item.divisionId} className="min-h-[72px] flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className={titleClass}>{item.tournamentName}</Text>
              <Text className={secondary}>{item.categoryName} · {month.format(utcDate(item.endDate))}</Text>
            </View>
            <Text className="max-w-[40%] rounded-full bg-[#f8f9e9] px-3 py-1 text-center font-sans text-xs text-[#626700]">{resultLabel[item.result]}</Text>
          </View>)}
        </View>
      </>}
    </RefreshableScrollView>
    {!own && <ProfileBottomNavigation />}
  </View>
}

export function HistoryScreen({ playerId }: { playerId: string }) {
  const profile = usePlayerProfile(playerId)
  const history = useSportingHistory(playerId)
  const { refreshing, onRefresh } = useRefreshControl(async () => {
    await Promise.all([history.refetch({ cancelRefetch: false }), profile.refetch({ cancelRefetch: false })])
  })
  const rows = hideProfileOn(history.error) ? [] : history.data?.pages.flatMap(page => page.items) ?? []
  const name = profile.data && !hideProfileOn(profile.error) ? profile.data.firstName + ' ' + profile.data.lastName : null
  return <View className="flex-1 bg-[#FEFEFE]">
    <ProfileHeader title={name ? 'Historial de ' + name : 'Historial de torneos'} back={() => {
      if (router.canGoBack()) router.back()
      else router.replace({ pathname: '/player/[playerId]', params: { playerId } })
    }} />
    <RefreshableScrollView alwaysBounceVertical refreshing={refreshing} onRefresh={onRefresh}
      contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 30, gap: 12, flexGrow: 1 }}>
      {history.isPending && <ProfileSkeleton />}
      {history.isError && <ProfileError message="No pudimos cargar el historial." onRetry={() => { void history.refetch() }} />}
      {history.isSuccess && rows.length === 0 && <Text className={secondary}>Todavía no hay torneos finalizados.</Text>}
      {rows.map(item => <Pressable key={item.eventId + item.divisionId} accessibilityRole="link"
        className="rounded-2xl border border-[#e7e7e8]" onPress={() => {
          router.push('/player/' + playerId + '/history/' + item.eventId + '/' + item.divisionId + '/results')
        }}>
        <View className="gap-1 p-4">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 font-inter-600 text-base">{item.tournamentName}</Text>
            <Text className="rounded-lg bg-[#C9CF38] px-2 py-1 font-sans text-xs">Finalizado</Text>
          </View>
          <Text className={secondary}>{item.clubName}</Text>
          <Text className={secondary}>{calendarDate.format(utcDate(item.endDate))}</Text>
        </View>
        <View className="gap-1 border-t border-[#b6b5b7] px-4 py-2">
          <View className="flex-row justify-between gap-2"><Text className={secondary}>Categoría</Text><Text className={titleClass}>{item.categoryName}</Text></View>
          <View className="flex-row justify-between gap-2"><Text className={secondary}>Instancia</Text><Text className={secondary}>{resultLabel[item.result]}</Text></View>
        </View>
      </Pressable>)}
      {history.hasNextPage && <Button variant="secondary" loading={history.isFetchingNextPage} onPress={() => { void history.fetchNextPage() }}>Ver más</Button>}
    </RefreshableScrollView>
  </View>
}

export function TournamentResultsScreen({ playerId, eventId, divisionId }: { playerId: string; eventId: string; divisionId: string }) {
  const { active: activeParam } = useLocalSearchParams<{ active?: string }>()
  const active = activeParam === '1'
  const query = useTournamentResults(playerId, eventId, divisionId, active)
  const data = hideProfileOn(query.error) ? undefined : query.data
  const { refreshing, onRefresh } = useRefreshControl(async () => { await query.refetch({ cancelRefetch: false }) })
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-[#FEFEFE]">
    <ProfileHeader title={active ? 'Detalle del torneo' : 'Resultados oficiales'} back={() => {
      if (router.canGoBack()) router.back()
      else if (active) router.replace('/my-tournaments')
      else router.replace({ pathname: '/player/[playerId]/history', params: { playerId } })
    }} />
    <RefreshableScrollView alwaysBounceVertical refreshing={refreshing} onRefresh={onRefresh}
      contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 12, flexGrow: 1 }}>
      {query.isPending && <ProfileSkeleton />}
      {query.isError && <ProfileError message={active ? 'No pudimos cargar el torneo.' : 'No pudimos cargar los resultados.'} onRetry={() => { void query.refetch() }} />}
      {data && <>
        <Text accessibilityRole="header" className="font-inter-600 text-lg">{data.tournament}</Text>
        <Text className={secondary}>{data.category}</Text>
        {active && <View className="gap-2 rounded-2xl border border-[#e7e7e8] p-4">
          <Text className={secondary}>{data.registration === 'WAITLIST' ? 'En lista de espera' : 'Inscripción confirmada'}</Text>
          <Text className={titleClass}>Próximo partido</Text>
          {data.nextMatch ? <>
            <Text className={secondary}>{new Date(data.nextMatch.startsAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' })}</Text>
            <Text className={secondary}>{data.nextMatch.venue} · {data.nextMatch.court}</Text>
          </> : <Text className={secondary}>Todavía no hay un partido programado.</Text>}
        </View>}
        {!active && !data.matches.length && <Text className={secondary}>Resultado no disponible</Text>}
        {data.matches.map(match => <View key={match.id} className="gap-2 rounded-2xl border border-[#e7e7e8] p-4">
          <Text className={titleClass}>{match.home} vs. {match.away}</Text>
          <Text className={secondary}>{match.walkover ? 'Walkover' : match.sets.length ? match.sets.map(set => set.home + '–' + set.away).join(' · ') : 'Marcador no disponible'}</Text>
          <Text className={secondary}>Ganadores: {match.winner}</Text>
        </View>)}
      </>}
    </RefreshableScrollView>
  </SafeAreaView>
}
