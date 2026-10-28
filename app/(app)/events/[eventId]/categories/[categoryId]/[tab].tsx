import { Redirect, useLocalSearchParams } from 'expo-router'
import { Text, View } from 'react-native'
import {
  CategoryBracketsTabPanel as CategoryBracketsTab,
  CategoryMatchesTab,
  CategoryQualifierTabPanel as CategoryQualifierTab,
  CategoryRegistrationsTab,
} from '@/features/events/components/CategoryTabPanels'
import { eventCategoryTabPath, findEventCategory, isCategoryTab } from '@/features/events/category-routes'
import type { CategoryTab } from '@/features/events/types'
import { useEventQuery } from '@/features/events/hooks/use-event-query'

export default function EventCategoryTabScreen() {
  const { eventId, categoryId, tab } = useLocalSearchParams<{
    eventId: string
    categoryId: string
    tab: string
  }>()
  const { event } = useEventQuery(eventId)

  if (!eventId || !categoryId || !tab) return null

  if (!isCategoryTab(tab)) {
    return <Redirect href={eventCategoryTabPath(eventId, categoryId, 'inscripciones')} />
  }

  if (!event) {
    return (
      <View className="p-4">
        <Text className="font-sans text-body-sm text-dark-700">Evento no encontrado.</Text>
      </View>
    )
  }

  const category = findEventCategory(event, categoryId)
  if (!category) {
    return (
      <View className="p-4">
        <Text className="font-sans text-body-sm text-dark-700">Categoría no encontrada.</Text>
      </View>
    )
  }

  const activeTab = tab as CategoryTab

  if (activeTab === 'partidos') return <CategoryMatchesTab category={category} />
  if (activeTab === 'inscripciones') return <CategoryRegistrationsTab category={category} />
  if (activeTab === 'clasificatoria') return <CategoryQualifierTab category={category} />
  return <CategoryBracketsTab category={category} />
}
