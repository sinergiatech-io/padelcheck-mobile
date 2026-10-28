import { useRouter } from 'expo-router'
import { Pressable, ScrollView, Text } from 'react-native'
import { cn } from '@/lib/utils'
import { CATEGORY_TABS, CATEGORY_TAB_LABELS, eventCategoryTabPath } from '../category-routes'
import type { CategoryTab } from '../types'
import { CategoryTabIcon } from './CategoryTabIcons'

type CategoryTabsProps = {
  eventId: string
  categoryId: string
  activeTab: CategoryTab
}

export function CategoryTabs({ eventId, categoryId, activeTab }: CategoryTabsProps) {
  const router = useRouter()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-t border-b border-[#b6b5b7] bg-surface"
    >
      {CATEGORY_TABS.map((tab) => {
        const isActive = tab === activeTab
        const href = eventCategoryTabPath(eventId, categoryId, tab)
        const iconColor = isActive ? '#B7BC33' : '#605E64'
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              if (!isActive) router.replace(href)
            }}
            className={cn(
              'h-[57px] flex-row items-center gap-2 px-2 py-4',
              isActive ? 'border-b border-primary-600 bg-[#FAFAEB]' : 'bg-surface',
            )}
          >
            <CategoryTabIcon tab={tab} size={20} color={iconColor} />
            <Text
              className={cn(
                'font-sans text-body-sm leading-6',
                isActive ? 'font-inter-600 text-primary-600' : 'font-medium text-[#605e64]',
              )}
            >
              {CATEGORY_TAB_LABELS[tab]}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
