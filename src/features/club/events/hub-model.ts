import type { ClubEventDetail, EventStatus } from './event-model'
import { showCalendarNotice } from './event-model'

export function hubNotice(event: ClubEventDetail) {
  if (showCalendarNotice(event)) {
    return {
      tone: 'warning',
      title: 'Horarios a confirmar',
      detail: event.status === 'INSCRIPTION_OPEN'
        ? 'Las inscripciones están abiertas. Completá el calendario antes de generar en AUTO.'
        : 'El calendario está incompleto. Podés abrir inscripciones; para generar en AUTO necesitás completarlo.',
    } as const
  }
  if (event.status === 'CANCELLED') {
    return { tone: 'neutral', title: 'Evento cancelado',
      detail: 'Podés consultar el historial. Las acciones operativas no están disponibles.' } as const
  }
  if (event.status === 'FINISHED') {
    return { tone: 'neutral', title: 'Evento finalizado',
      detail: 'Podés consultar el historial de cada categoría.' } as const
  }
  return null
}

export function statusBackground(status: EventStatus) {
  switch (status) {
    case 'INSCRIPTION_OPEN': return '#c9cf38'
    case 'CANCELLED': return '#f56868'
    case 'DRAFT': return '#adadad'
    default: return '#e7e7e8'
  }
}

export function categoryCount(count: number) {
  return count + (count === 1 ? ' categoría' : ' categorías')
}
