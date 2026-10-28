import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { eventCategoryOpenEnrollmentPath } from '@/features/events/category-routes'

/** Legacy /enroll → tab Inscripciones con modal abierto. */
export default function EventCategoryEnrollRedirect() {
  const { eventId, categoryId } = useLocalSearchParams<{ eventId: string; categoryId: string }>()
  const router = useRouter()
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (!eventId || !categoryId || redirectedRef.current) return
    redirectedRef.current = true
    router.replace(eventCategoryOpenEnrollmentPath(eventId, categoryId))
  }, [eventId, categoryId, router])

  return null
}
