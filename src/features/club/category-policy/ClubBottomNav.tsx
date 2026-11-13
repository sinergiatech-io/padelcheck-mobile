import { Pressable, Text, View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { venueIcons } from '../venues/venue-icons'

const icons = { dashboard: venueIcons.navDashboard, events: venueIcons.navEvents, players: venueIcons.navPlayers, club: venueIcons.navClub }

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
