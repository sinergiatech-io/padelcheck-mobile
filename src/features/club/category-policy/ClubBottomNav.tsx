import { Image, Pressable, Text, View } from 'react-native'
import { SvgUri } from 'react-native-svg'

const icons = {
  dashboard: Image.resolveAssetSource(require('@/assets/category-policy/nav-dashboard.svg'))?.uri ?? '',
  events: Image.resolveAssetSource(require('@/assets/category-policy/nav-events.svg'))?.uri ?? '',
  players: Image.resolveAssetSource(require('@/assets/category-policy/nav-players.svg'))?.uri ?? '',
  club: Image.resolveAssetSource(require('@/assets/category-policy/nav-club.svg'))?.uri ?? '',
}

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
          <SvgUri uri={item.icon} width={19.9832} height={19.9832} />
          <Text className="font-inter-400" style={{ fontSize: 12, lineHeight: 16, color: item.label === 'Mi Club' ? '#C9CF38' : '#FAFAEB' }}>{item.label}</Text>
        </Pressable>)}
      </View>
    </View>
  )
}
