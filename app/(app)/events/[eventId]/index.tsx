import { useLocalSearchParams } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  CalendarTodayIcon,
  LocationOnIcon,
  MoneyIcon,
} from '@/components/icons/TournamentCardIcons'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Event } from '@/features/events/types'
import { EventCategoryCard } from '@/features/events/components/EventCategoryCard'
import { EventMobileHeader } from '@/features/events/components/EventMobileHeader'
import { useEventQuery } from '@/features/events/hooks/use-event-query'

function statusLabel(status: Event['status']) {
  if (status === 'INSCRIPTION_OPEN') return 'Inscripciones abiertas'
  if (status === 'INSCRIPTION_CLOSED') return 'Cerrado'
  if (status === 'IN_PROGRESS') return 'Torneo en curso'
  if (status === 'FINISHED') return 'Finalizado'
  if (status === 'CANCELLED') return 'Cancelado'
  return 'Borrador'
}

function badgeVariant(status: Event['status']) {
  if (status === 'INSCRIPTION_OPEN') return 'primary'
  if (status === 'IN_PROGRESS' || status === 'FINISHED') return 'success'
  if (status === 'CANCELLED') return 'destructive'
  return 'neutral'
}

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>()
  const { event, refreshing, onRefresh } = useEventQuery(eventId)

  if (!eventId) return null
  if (!event) {
    return (
      <View className="flex-1 bg-background">
        <EventMobileHeader eventId={eventId} />
        <Text className="p-4 font-sans text-body-sm text-dark-700">Evento no encontrado.</Text>
      </View>
    )
  }

  const locationLine = `${event.club} - ${event.locationName}`

  return (
    <View className="flex-1 bg-background">
      <EventMobileHeader eventId={eventId} />
      <RefreshableScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <View className="gap-4 px-4 pb-24 pt-4">
          <Card className="overflow-hidden rounded-2xl border border-divider">
            <View className="relative h-[111px] overflow-hidden rounded-t-2xl">
              <LinearGradient
                colors={['#e6e9a3', '#eef0c1']}
                locations={[0.019, 0.921]}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View className="absolute right-2.5 top-3" pointerEvents="box-none">
                <Badge
                  variant={badgeVariant(event.status)}
                  className="rounded-lg px-2 py-1"
                  textClassName="font-sans"
                >
                  {statusLabel(event.status)}
                </Badge>
              </View>
            </View>
            <CardContent className="gap-2 p-4">
              <Text className="font-inter-700 text-base leading-7 text-dark-900">{event.title}</Text>
              <View className="gap-3">
                <View className="flex-row items-start gap-2">
                  <LocationOnIcon size={24} color="#C9CF38" />
                  <Text className="flex-1 font-sans text-body-sm leading-6 text-[#605e64]">{locationLine}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <CalendarTodayIcon size={24} color="#C9CF38" />
                  <Text className="flex-1 font-sans text-body-sm leading-6 text-[#605e64]">{event.dateLabel}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MoneyIcon size={24} color="#C9CF38" />
                  <Text className="flex-1 font-sans text-body-sm leading-6 text-[#605e64]">{event.priceLabel}</Text>
                </View>
              </View>
            </CardContent>
          </Card>

          <View className="gap-4">
            <Text className="font-inter-700 text-base leading-7 text-dark-900">
              Categorías ({event.categories.length})
            </Text>
            <View className="gap-3">
              {event.categories.map((category) => (
                <EventCategoryCard key={category.id} event={event} category={category} />
              ))}
            </View>
          </View>
        </View>
      </RefreshableScrollView>
    </View>
  )
}
