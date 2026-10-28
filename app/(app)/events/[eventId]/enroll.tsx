import { Redirect, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { eventsMockService } from '@/features/events/api/events.mock'
import { eventCategoryOpenEnrollmentPath } from '@/features/events/category-routes'

export default function LegacyEnrollRedirect() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    eventsMockService.getEvent(eventId).then((event) => {
      const categoryId = event?.categories[0]?.id
      if (!event || !categoryId) {
        setTarget(`/events/${eventId}`)
        return
      }
      setTarget(eventCategoryOpenEnrollmentPath(event.id, categoryId))
    })
  }, [eventId])

  if (!eventId) return null
  if (!target) {
    return (
      <View className="flex-1 bg-background p-4">
        <Text className="font-sans text-body-sm text-dark-700">Cargando…</Text>
      </View>
    )
  }

  return <Redirect href={target} />
}
