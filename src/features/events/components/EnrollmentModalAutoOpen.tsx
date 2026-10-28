import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { eventCategoryTabPath } from '@/features/events/category-routes'
import { useEnrollmentModal } from '@/features/events/context/EnrollmentModalContext'

type EnrollmentModalAutoOpenProps = {
  eventId: string
  categoryId: string
}

/** Abre el modal de inscripción cuando la ruta trae ?openEnrollment=1 (p. ej. desde la card del evento). */
export function EnrollmentModalAutoOpen({ eventId, categoryId }: EnrollmentModalAutoOpenProps) {
  const { openEnrollment } = useLocalSearchParams<{ openEnrollment?: string }>()
  const { openCreate } = useEnrollmentModal()
  const router = useRouter()
  const handledRef = useRef(false)

  useEffect(() => {
    if (openEnrollment !== '1') {
      handledRef.current = false
      return
    }
    if (handledRef.current) return
    handledRef.current = true

    openCreate()
    router.replace(eventCategoryTabPath(eventId, categoryId, 'inscripciones'))
  }, [openEnrollment, eventId, categoryId, openCreate, router])

  return null
}
