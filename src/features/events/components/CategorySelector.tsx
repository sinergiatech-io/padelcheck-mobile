import { router } from 'expo-router'
import { ChevronDown } from 'lucide-react-native'
import { TrophyFilledIcon } from '@/components/icons/TrophyIcon'
import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { cn } from '@/lib/utils'
import { eventCategoryTabPath, isCategoryTab } from '../category-routes'
import type { Event, EventCategory } from '../types'

type CategorySelectorProps = {
  event: Event
  category: EventCategory
  activeTab: string
}

export function CategorySelector({ event, category, activeTab }: CategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<View>(null)

  useEffect(() => {
    setOpen(false)
  }, [category.id])

  function selectCategory(nextCategoryId: string) {
    setOpen(false)
    const tab = isCategoryTab(activeTab) ? activeTab : 'inscripciones'
    router.replace(eventCategoryTabPath(event.id, nextCategoryId, tab))
  }

  return (
    <View className="relative px-2 py-4" ref={containerRef}>
      <Pressable
        className="flex-row items-center justify-between rounded-lg border border-[#b6b5b7] bg-surface px-4 py-2"
        onPress={() => setOpen((value) => !value)}
      >
        <View className="flex-row items-center gap-2">
          <TrophyFilledIcon size={24} color="#C9CF38" />
          <Text className="font-sans text-body-sm font-medium leading-8 text-dark-900">{category.name}</Text>
        </View>
        <ChevronDown size={24} color="#120F18" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? (
        <View className="absolute left-2 right-2 top-full z-20 mt-1 overflow-hidden rounded-lg border border-divider bg-surface shadow-lg">
          {event.categories.map((item) => (
            <Pressable
              key={item.id}
              className={cn(
                'flex-row items-center gap-2 px-4 py-3',
                item.id === category.id ? 'bg-[#FAFAEB]' : 'bg-surface',
              )}
              onPress={() => selectCategory(item.id)}
            >
              <TrophyFilledIcon size={20} color="#C9CF38" />
              <Text
                className={cn(
                  'font-sans text-body-sm',
                  item.id === category.id ? 'font-inter-600 text-dark-900' : 'text-dark-700',
                )}
              >
                {item.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}
