import { useCallback, useEffect, useState } from 'react'
import { router } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { ChevronRight, MapPin } from 'lucide-react-native'
import { FigmaSearchField } from '@/components/ui/figma-search-field'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { eventsMockService } from '@/features/events/api/events.mock'
import { EventCard } from '@/features/events/components/EventCard'
import { EventsListMobileHeader } from '@/features/events/components/EventsListMobileHeader'
import { getSelectedLocationId } from '@/features/events/selected-location'
import type { Event, Location } from '@/features/events/types'
import { useRefreshControl } from '@/hooks/use-refresh-control'
import { ROUTES } from '@/lib/constants'

export default function EventsScreen() {
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState(getSelectedLocationId)
  const [events, setEvents] = useState<Event[]>([])
  const [query, setQuery] = useState('')

  const loadEventsData = useCallback(async (locationId = getSelectedLocationId()) => {
    const [nextLocations, nextEvents] = await Promise.all([
      eventsMockService.listLocations(),
      eventsMockService.listEventsByLocation(locationId),
    ])
    setLocations(nextLocations)
    setSelectedLocation(locationId)
    setEvents(nextEvents)
  }, [])

  useEffect(() => {
    void loadEventsData(selectedLocation)
  }, [loadEventsData, selectedLocation])

  useFocusEffect(
    useCallback(() => {
      const locationId = getSelectedLocationId()
      if (locationId !== selectedLocation) {
        setSelectedLocation(locationId)
      }
    }, [selectedLocation]),
  )

  const { refreshing, onRefresh } = useRefreshControl(() => loadEventsData())

  const filteredEvents = events.filter((event) => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return true
    return (
      event.title.toLowerCase().includes(normalizedQuery) ||
      event.club.toLowerCase().includes(normalizedQuery) ||
      event.locationName.toLowerCase().includes(normalizedQuery)
    )
  })

  return (
    <View className="flex-1 bg-background">
      <EventsListMobileHeader />
      <RefreshableScrollView className="flex-1 bg-background" refreshing={refreshing} onRefresh={onRefresh}>
        <Pressable
          className="h-12 flex-row items-center justify-between border-b border-[#e7e7e8] bg-surface px-4"
          onPress={() => router.push(ROUTES.eventLocation)}
        >
          <View className="flex-row items-center gap-2">
            <MapPin size={20} color="#C9CF38" />
            <Text className="font-inter-600 text-body-sm text-dark-900">
              {locations.find((location) => location.id === selectedLocation)?.name ?? ''}
            </Text>
          </View>
          <ChevronRight size={20} color="#2A2536" />
        </Pressable>
        <View className="gap-4 px-4 pb-24 pt-4">
          <FigmaSearchField value={query} onChangeText={setQuery} />
          <View className="gap-4">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </View>
        </View>
      </RefreshableScrollView>
    </View>
  )
}
