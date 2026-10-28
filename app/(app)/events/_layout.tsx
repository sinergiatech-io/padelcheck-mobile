import { Stack } from 'expo-router'

export default function EventsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F5F5F5' },
      }}
    >
      <Stack.Screen
        name="[eventId]/categories/[categoryId]/[tab]"
        options={{ animation: 'none' }}
      />
    </Stack>
  )
}
