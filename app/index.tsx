import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { ROUTES } from '@/lib/constants'

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#C9CF38" />
      </View>
    )
  }

  if (isAuthenticated) {
    return <Redirect href={ROUTES.events} />
  }

  return <Redirect href={ROUTES.login} />
}
