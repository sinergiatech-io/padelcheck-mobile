import { Redirect, Tabs, usePathname } from 'expo-router'
import { ActivityIndicator, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  BOTTOM_NAV_ACTIVE_COLOR,
  BOTTOM_NAV_ICON_SIZE,
  BOTTOM_NAV_INACTIVE_COLOR,
  BottomNavEventsIcon,
  BottomNavPlayersIcon,
  BottomNavProfileIcon,
  BottomNavTournamentsIcon,
} from '@/components/icons/BottomNavIcons'
import { useAuth } from '@/context/AuthContext'
import { guardRedirect } from '@/features/auth/access-destination'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { ROUTES } from '@/lib/constants'

const TAB_BAR_CONTENT_HEIGHT = 64

const tabBarLabelStyle = {
  fontSize: 12,
  lineHeight: 16,
  fontFamily: 'Inter_400Regular',
  fontWeight: '400' as const,
  marginTop: 4,
  textAlign: 'center' as const,
}

function AppTabs({ mode }: { mode: 'player' | 'club' }) {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BOTTOM_NAV_ACTIVE_COLOR,
        tabBarInactiveTintColor: BOTTOM_NAV_INACTIVE_COLOR,
        tabBarAllowFontScaling: false,
        tabBarIconStyle: { marginBottom: 0 },
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabel: ({ color, children }) => (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={[tabBarLabelStyle, { color }]}
          >
            {children}
          </Text>
        ),
        tabBarStyle: {
          backgroundColor: '#120F18',
          borderTopWidth: 0,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom,
          paddingHorizontal: 8,
        },
      }}
    >
      <Tabs.Screen
        name="events"
        options={{
          title: 'Eventos',
          href: mode === 'club' ? null : undefined,
          tabBarIcon: ({ color }) => <BottomNavEventsIcon color={color} size={BOTTOM_NAV_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="my-tournaments"
        options={{
          title: 'Mis Torneos',
          href: mode === 'club' ? null : undefined,
          tabBarIcon: ({ color }) => <BottomNavTournamentsIcon color={color} size={BOTTOM_NAV_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: 'Jugadores',
          href: mode === 'club' ? null : undefined,
          tabBarIcon: ({ color }) => <BottomNavPlayersIcon color={color} size={BOTTOM_NAV_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Perfil',
          href: mode === 'club' ? null : undefined,
          tabBarIcon: ({ color }) => <BottomNavProfileIcon color={color} size={BOTTOM_NAV_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Club',
          href: mode === 'player' ? null : undefined,
        }}
      />
    </Tabs>
  )
}

export default function AppGroupLayout() {
  const pathname = usePathname()
  const { phase, destination } = useAuth()

  if (phase === 'checking') {
    return (
      <View className="flex-1 items-center justify-center bg-[#120F18]">
        <ActivityIndicator size="large" color="#C9CF38" />
      </View>
    )
  }

  if (phase === 'unverified') return <SessionUnverified />
  if (phase !== 'ready' || !destination) return <Redirect href={ROUTES.login} />

  const redirect = guardRedirect('native', destination, pathname)
  if (redirect) return <Redirect href={redirect} />

  return <AppTabs mode={destination.kind === 'club' ? 'club' : 'player'} />
}
