import type { CategoryTab, Event, EventStatus } from './types'

export const CATEGORY_TABS: CategoryTab[] = ['partidos', 'inscripciones', 'clasificatoria', 'cuadros']

export const CATEGORY_TAB_LABELS: Record<CategoryTab, string> = {
  partidos: 'Partidos',
  inscripciones: 'Inscripciones',
  clasificatoria: 'Clasificatoria',
  cuadros: 'Cuadros',
}

export function isCategoryTab(value: string): value is CategoryTab {
  return CATEGORY_TABS.includes(value as CategoryTab)
}

export function getDefaultCategoryTab(status: EventStatus): CategoryTab {
  if (status === 'INSCRIPTION_OPEN') return 'inscripciones'
  return 'partidos'
}

export function eventCategoryTabPath(eventId: string, categoryId: string, tab: CategoryTab) {
  return `/events/${eventId}/categories/${categoryId}/${tab}`
}

export function eventCategoryEnrollPath(eventId: string, categoryId: string) {
  return `/events/${eventId}/categories/${categoryId}/enroll`
}

/** Tab Inscripciones + flag para abrir el modal al llegar (desde card del evento). */
export function eventCategoryOpenEnrollmentPath(eventId: string, categoryId: string) {
  return `${eventCategoryTabPath(eventId, categoryId, 'inscripciones')}?openEnrollment=1`
}

export function findEventCategory(event: Event | undefined, categoryId: string) {
  return event?.categories.find((category) => category.id === categoryId)
}

/** Last path segment when it is a valid tab (e.g. …/inscripciones). */
export function getCategoryTabFromPathname(pathname: string): CategoryTab | undefined {
  const segment = pathname.split('/').filter(Boolean).pop()
  return segment && isCategoryTab(segment) ? segment : undefined
}
