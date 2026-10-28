import { useCallback, useEffect, useState } from 'react'
import { eventsMockService } from '@/features/events/api/events.mock'
import type { Event } from '@/features/events/types'
import { useRefreshControl } from '@/hooks/use-refresh-control'

/** Load event by id with pull-to-refresh — use on event detail sub-screens. */
export function useEventQuery(eventId: string | undefined) {
  const [event, setEvent] = useState<Event | undefined>()

  const loadEvent = useCallback(async () => {
    if (!eventId) return
    const nextEvent = await eventsMockService.getEvent(eventId)
    setEvent(nextEvent)
  }, [eventId])

  useEffect(() => {
    void loadEvent()
  }, [loadEvent])

  const { refreshing, onRefresh } = useRefreshControl(loadEvent)

  return { event, refreshing, onRefresh }
}
