import { Link } from 'expo-router'
import { ArrowForwardIcon, UsersIcon } from '@/components/icons/TournamentCardIcons'
import { Pressable, Text, View } from 'react-native'
import { Button } from '@/components/ui/button'
import {
  eventCategoryOpenEnrollmentPath,
  eventCategoryTabPath,
  getDefaultCategoryTab,
} from '../category-routes'
import type { Event, EventCategory } from '../types'

type EventCategoryCardProps = {
  event: Event
  category: EventCategory
}

export function EventCategoryCard({ event, category }: EventCategoryCardProps) {
  const defaultTab = getDefaultCategoryTab(event.status)
  const detailPath = eventCategoryTabPath(event.id, category.id, defaultTab)

  return (
    <View className="overflow-hidden rounded-2xl bg-surface p-4 shadow-sm">
      <Link href={detailPath} asChild>
        <Pressable className="flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1 gap-2">
            <Text className="font-inter-700 text-base leading-7 text-dark-900">{category.name}</Text>
            <View className="flex-row items-center gap-2">
              <UsersIcon size={24} color="#605E64" />
              <Text className="font-sans text-body-sm leading-7 text-[#605e64]">
                {category.playerCount} jugadores
              </Text>
            </View>
          </View>
          <ArrowForwardIcon size={24} color="#120F18" />
        </Pressable>
      </Link>
      {category.canEnroll ? (
        <Link href={eventCategoryOpenEnrollmentPath(event.id, category.id)} asChild>
          <Button className="mt-4 h-10 w-full rounded-lg">
            Inscribirse
          </Button>
        </Link>
      ) : null}
    </View>
  )
}
