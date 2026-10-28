import type { ReactNode } from 'react'
import { View } from 'react-native'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { CategoryEnrollFab } from '@/features/events/components/CategoryEnrollFab'
import { EnrollmentModal } from '@/features/events/components/EnrollmentModal'
import { EnrollmentModalAutoOpen } from '@/features/events/components/EnrollmentModalAutoOpen'
import { categoryEnrollFabScrollPadding } from '@/features/events/components/category-enroll-fab.constants'
import { CategorySelector } from '@/features/events/components/CategorySelector'
import { CategoryTabs } from '@/features/events/components/CategoryTabs'
import { EventMobileHeader } from '@/features/events/components/EventMobileHeader'
import { EnrollmentModalProvider } from '@/features/events/context/EnrollmentModalContext'
import type { CategoryTab, Event, EventCategory } from '@/features/events/types'

type CategoryScreenShellProps = {
  eventId: string
  event: Event
  category: EventCategory
  activeTab?: CategoryTab
  refreshing: boolean
  onRefresh: () => void
  children: ReactNode
}

export function CategoryScreenShell({
  eventId,
  event,
  category,
  activeTab,
  refreshing,
  onRefresh,
  children,
}: CategoryScreenShellProps) {
  return (
    <EnrollmentModalProvider>
      <View className="flex-1 overflow-visible bg-[#f7f7f7]">
        <EventMobileHeader eventId={eventId} backHref={`/events/${eventId}`} />

        <View className="bg-surface">
          <CategorySelector event={event} category={category} activeTab={activeTab ?? 'inscripciones'} />
          {activeTab ? (
            <CategoryTabs eventId={eventId} categoryId={category.id} activeTab={activeTab} />
          ) : null}
        </View>

        <RefreshableScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: categoryEnrollFabScrollPadding() }}
        >
          {children}
        </RefreshableScrollView>

        {/* Visibilidad según reglas de negocio: pendiente (canEnroll, tab, estado evento). */}
        <CategoryEnrollFab eventId={event.id} categoryId={category.id} />
        <EnrollmentModalAutoOpen eventId={event.id} categoryId={category.id} />
        <EnrollmentModal eventId={event.id} categoryId={category.id} onSuccess={onRefresh} />
      </View>
    </EnrollmentModalProvider>
  )
}
