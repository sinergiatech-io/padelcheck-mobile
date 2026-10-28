import { Slot, useLocalSearchParams, usePathname } from 'expo-router'
import { Text, View } from 'react-native'
import { CategoryScreenShell } from '@/features/events/components/CategoryScreenShell'
import { findEventCategory, getCategoryTabFromPathname } from '@/features/events/category-routes'
import { useEventQuery } from '@/features/events/hooks/use-event-query'

export default function EventCategoryLayout() {
  const { eventId, categoryId } = useLocalSearchParams<{ eventId: string; categoryId: string }>()
  const pathname = usePathname()
  const { event, refreshing, onRefresh } = useEventQuery(eventId)

  if (!eventId || !categoryId) return null

  if (!event) {
    return (
      <View className="flex-1 bg-background p-4">
        <Text className="font-sans text-body-sm text-dark-700">Evento no encontrado.</Text>
      </View>
    )
  }

  const category = findEventCategory(event, categoryId)
  if (!category) {
    return (
      <View className="flex-1 bg-background p-4">
        <Text className="font-sans text-body-sm text-dark-700">Categoría no encontrada.</Text>
      </View>
    )
  }

  const activeTab = getCategoryTabFromPathname(pathname) ?? 'inscripciones'

  return (
    <CategoryScreenShell
      eventId={eventId}
      event={event}
      category={category}
      activeTab={activeTab}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Slot />
    </CategoryScreenShell>
  )
}
