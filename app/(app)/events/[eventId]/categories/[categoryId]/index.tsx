import { Redirect, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { eventsMockService } from '@/features/events/api/events.mock'
import { eventCategoryTabPath, getDefaultCategoryTab } from '@/features/events/category-routes'

export default function EventCategoryDefaultScreen() {
  const { eventId, categoryId } = useLocalSearchParams<{ eventId: string; categoryId: string }>()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId || !categoryId) return
    eventsMockService.getEvent(eventId).then((event) => {
      if (!event) {
        setTarget(`/events/${eventId}`)
        return
      }
      const tab = getDefaultCategoryTab(event.status)
      setTarget(eventCategoryTabPath(event.id, categoryId, tab))
    })
  }, [eventId, categoryId])

  if (!eventId || !categoryId) return null
  if (!target) {
    return (
      <View className="flex-1 bg-background p-4">
        <Text className="font-sans text-body-sm text-dark-700">Cargando…</Text>
      </View>
    )
  }

  return <Redirect href={target} />
}
