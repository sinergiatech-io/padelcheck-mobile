import { Pressable, Text, View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { router, type Href } from 'expo-router'
import {
  BOTTOM_NAV_ACTIVE_COLOR,
  BOTTOM_NAV_ICON_SIZE,
  BOTTOM_NAV_INACTIVE_COLOR,
  BottomNavEventsIcon,
  BottomNavPlayersIcon,
  BottomNavProfileIcon,
  BottomNavTournamentsIcon,
} from '@/components/icons/BottomNavIcons'
import { ROUTES } from '@/lib/constants'
import { venueIcons } from '../venues/venue-icons'

const icons = { dashboard: venueIcons.navDashboard, events: venueIcons.navEvents, players: venueIcons.navPlayers, club: venueIcons.navClub }

const playerItems = [
  { label: 'Eventos', href: ROUTES.events, Icon: BottomNavEventsIcon },
  { label: 'Mis Torneos', href: '/my-tournaments', Icon: BottomNavTournamentsIcon },
  { label: 'Jugadores', href: '/players', Icon: BottomNavPlayersIcon },
  { label: 'Perfil', href: '/settings', Icon: BottomNavProfileIcon },
] as const

interface ClubBottomNavProps {
  onDashboard: () => void
  onClub: () => void
  onEvents?: () => void
  onPlayers?: () => void
  bottomInset: number
  busy?: boolean
}

/** Explicit dp measurements match the 64px Figma bar, independently of NativeWind rem. */
export function ClubBottomNav({ onDashboard, onClub, onEvents, onPlayers, bottomInset, busy }: ClubBottomNavProps) {
  const items = [
    { label: 'Dashboard', icon: icons.dashboard, onPress: onDashboard },
    { label: 'Eventos', icon: icons.events, onPress: onEvents },
    { label: 'Jugadores', icon: icons.players, onPress: onPlayers },
    { label: 'Mi Club', icon: icons.club, onPress: onClub },
  ]
  return (
    <View style={{ paddingBottom: bottomInset, backgroundColor: '#120F18' }}>
      <View style={{ height: 64, paddingHorizontal: 16, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {items.map(item => <Pressable key={item.label} accessibilityRole="tab" accessibilityLabel={item.label}
          accessibilityState={{ selected: item.label === 'Mi Club', disabled: Boolean(busy || !item.onPress) }}
          disabled={busy || !item.onPress} onPress={item.onPress}
          style={{ height: 56, paddingHorizontal: 12, paddingVertical: 8, gap: 4, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
          <SvgXml xml={item.icon.xml} width={item.icon.width} height={item.icon.height} />
          <Text className="font-sans" style={{ fontSize: 12, lineHeight: 16, color: item.label === 'Mi Club' ? '#C9CF38' : '#FAFAEB' }}>{item.label}</Text>
        </Pressable>)}
      </View>
    </View>
  )
}

/** Player shell for screens outside (app) Tabs (e.g. public club profile). */
export function PlayerBottomNav({ bottomInset, activeLabel }: { bottomInset: number; activeLabel?: string }) {
  return (
    <View style={{ paddingBottom: bottomInset, backgroundColor: '#120F18' }}>
      <View style={{ height: 64, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' }}>
        {playerItems.map(item => {
          const selected = item.label === activeLabel
          const color = selected ? BOTTOM_NAV_ACTIVE_COLOR : BOTTOM_NAV_INACTIVE_COLOR
          return (
            <Pressable
              key={item.label}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              onPress={() => router.replace(item.href as Href)}
              style={{ flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', gap: 4 }}
            >
              <item.Icon color={color} size={BOTTOM_NAV_ICON_SIZE} />
              <Text className="font-inter-400" style={{ fontSize: 12, lineHeight: 16, color }} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
