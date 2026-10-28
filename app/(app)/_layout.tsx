import { Redirect, Tabs } from 'expo-router'
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

function AppTabs() {
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
          tabBarIcon: ({ color }) => <BottomNavEventsIcon color={color} size={BOTTOM_NAV_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="my-tournaments"
        options={{
          title: 'Mis Torneos',
          tabBarIcon: ({ color }) => <BottomNavTournamentsIcon color={color} size={BOTTOM_NAV_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: 'Jugadores',
          tabBarIcon: ({ color }) => <BottomNavPlayersIcon color={color} size={BOTTOM_NAV_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <BottomNavProfileIcon color={color} size={BOTTOM_NAV_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
    </Tabs>
  )
}

export default function AppGroupLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#C9CF38" />
      </View>
    )
  }

  if (!isAuthenticated) {
    return <Redirect href={ROUTES.login} />
  }

  return <AppTabs />
}
