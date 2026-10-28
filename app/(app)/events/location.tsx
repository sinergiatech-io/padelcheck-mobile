import { useCallback, useEffect, useMemo, useState } from 'react'
import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { Check, MapPin, X } from 'lucide-react-native'
import { FigmaSearchField } from '@/components/ui/figma-search-field'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { eventsMockService } from '@/features/events/api/events.mock'
import { LocationMobileHeader } from '@/features/events/components/LocationMobileHeader'
import { getSelectedLocationId, setSelectedLocationId } from '@/features/events/selected-location'
import type { Location } from '@/features/events/types'
import { useRefreshControl } from '@/hooks/use-refresh-control'

export default function EventsLocationScreen() {
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedId, setSelectedId] = useState(getSelectedLocationId)
  const [query, setQuery] = useState('')

  const loadLocations = useCallback(async () => {
    const nextLocations = await eventsMockService.listLocations()
    setLocations(nextLocations)
    setSelectedId(getSelectedLocationId())
  }, [])

  useEffect(() => {
    void loadLocations()
  }, [loadLocations])

  const { refreshing, onRefresh } = useRefreshControl(loadLocations)

  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return locations
    return locations.filter((location) => location.name.toLowerCase().includes(normalizedQuery))
  }, [locations, query])

  function selectLocation(locationId: string) {
    setSelectedLocationId(locationId)
    setSelectedId(locationId)
    router.replace('/events')
  }

  function removeLocation(locationId: string) {
    setLocations((prev) => prev.filter((location) => location.id !== locationId))
    if (selectedId === locationId && locations.length > 1) {
      const next = locations.find((location) => location.id !== locationId)
      if (next) setSelectedId(next.id)
    }
  }

  return (
    <View className="flex-1 bg-background">
      <LocationMobileHeader />
      <RefreshableScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <View className="px-4 pb-24 pt-4">
          <FigmaSearchField value={query} onChangeText={setQuery} />

          <View className="gap-3" style={{ marginTop: 24 }}>
            <Text className="px-2 font-inter-600 text-body-sm uppercase tracking-[0.35px] text-[#6b7280]">
              Mis Ubicaciones
            </Text>
            <View className="overflow-hidden rounded-2xl bg-surface">
              {filteredLocations.map((location, index) => {
                const isSelected = location.id === selectedId
                const isLast = index === filteredLocations.length - 1
                return (
                  <View
                    key={location.id}
                    className={
                      isLast
                        ? 'h-[69px] flex-row items-center justify-between px-4 py-4'
                        : 'h-[69px] flex-row items-center justify-between border-b border-[#e5e5e5] px-4 py-4'
                    }
                  >
                    <Pressable
                      className="min-w-0 flex-1 flex-row items-center gap-3"
                      onPress={() => selectLocation(location.id)}
                    >
                      <MapPin size={20} color={isSelected ? '#C9CF38' : '#6b7280'} />
                      <Text className="font-inter-500 text-base leading-6 text-dark-900">{location.name}</Text>
                    </Pressable>
                    <View className="flex-row items-center gap-2">
                      {isSelected ? <Check size={20} color="#C9CF38" /> : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar ${location.name}`}
                        className="h-9 w-9 items-center justify-center"
                        onPress={() => removeLocation(location.id)}
                      >
                        <X size={20} color="#6b7280" />
                      </Pressable>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        </View>
      </RefreshableScrollView>
    </View>
  )
}
