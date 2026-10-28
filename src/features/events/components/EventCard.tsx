import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  ArrowForwardIcon,
  CalendarTodayIcon,
  LocationOnIcon,
} from '@/components/icons/TournamentCardIcons'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Event } from '../types'

const PRIMARY_600 = '#B4BA2F'

function badgeVariant(status: Event['status']) {
  if (status === 'INSCRIPTION_OPEN') return 'primary'
  if (status === 'IN_PROGRESS' || status === 'FINISHED') return 'success'
  if (status === 'CANCELLED') return 'destructive'
  return 'neutral'
}

function badgeLabel(status: Event['status']) {
  if (status === 'INSCRIPTION_OPEN') return 'Inscripciones abiertas'
  if (status === 'INSCRIPTION_CLOSED') return 'Cerrado'
  if (status === 'IN_PROGRESS') return 'Torneo en curso'
  if (status === 'FINISHED') return 'Finalizado'
  if (status === 'CANCELLED') return 'Cancelado'
  return 'Borrador'
}

export function EventCard({ event }: { event: Event }) {
  return (
    <Link href={`/events/${event.id}`} asChild>
      <Pressable>
        <Card className="overflow-hidden rounded-2xl border border-[#e7e7e8]">
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
                {badgeLabel(event.status)}
              </Badge>
            </View>
          </View>
          <CardContent className="p-0">
            <View className="px-4 pt-2">
              <Text className="font-inter-700 text-base leading-8 text-dark-900">{event.title}</Text>
              <Text className="font-inter-500 text-body-sm leading-8 text-[#605e64]">{event.club}</Text>
              <View className="flex flex-col gap-1 pb-2 pt-0">
                <View className="flex-row items-center gap-2">
                  <LocationOnIcon size={24} color="#C9CF38" />
                  <Text className="flex-1 font-inter-500 text-caption leading-6 text-[#605e64]">{event.locationName}</Text>
                </View>
                <View className="min-h-6 flex-row items-center gap-2">
                  <CalendarTodayIcon size={24} color="#C9CF38" />
                  <Text className="flex-1 font-inter-500 text-caption leading-6 text-[#605e64]">{event.dateLabel}</Text>
                </View>
              </View>
            </View>
            <View className="flex-row items-center justify-between px-4 py-2">
              <Text className="font-inter-600 text-body-sm text-primary-600">Ver detalles</Text>
              <ArrowForwardIcon size={24} color={PRIMARY_600} />
            </View>
          </CardContent>
        </Card>
      </Pressable>
    </Link>
  )
}
