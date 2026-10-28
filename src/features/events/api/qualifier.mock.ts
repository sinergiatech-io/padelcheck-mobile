import type { QualifierZone } from '@/features/events/types'

/** Columnas de la tabla de posiciones — Figma 378:2882. */
export const QUALIFIER_STANDING_COLUMNS = [
  { key: 'pj', label: 'PJ' },
  { key: 'pg', label: 'PG' },
  { key: 'pp', label: 'PP' },
  { key: 'sg', label: 'SG' },
  { key: 'sp', label: 'SP' },
  { key: 'gg', label: 'GG' },
  { key: 'gp', label: 'GP' },
] as const

/** Zona A + partidos de ejemplo alineados a Figma 378:2549. */
export function defaultQualifierZones(categoryId: string, club = 'Club Central'): QualifierZone[] {
  return [
    {
      id: `${categoryId}-zona-a`,
      name: 'Zona A',
      standings: [
        {
          id: `${categoryId}-s1`,
          player1: 'Andres Lopez',
          player2: 'Geronimo Garcia',
          pj: 2,
          pg: 2,
          pp: 0,
          sg: 4,
          sp: 2,
          gg: 24,
          gp: 8,
        },
        {
          id: `${categoryId}-s2`,
          player1: 'Juan Pérez',
          player2: 'Carlos López',
          pj: 2,
          pg: 1,
          pp: 1,
          sg: 3,
          sp: 3,
          gg: 12,
          gp: 12,
        },
        {
          id: `${categoryId}-s3`,
          player1: 'Marcos Iriarte',
          player2: 'Leo Benítez',
          pj: 2,
          pg: 0,
          pp: 2,
          sg: 2,
          sp: 4,
          gg: 10,
          gp: 24,
        },
      ],
      matches: [
        {
          id: `${categoryId}-qm1`,
          teamA: ['A. Pérez', 'L. López'],
          teamB: ['G. García', 'J. Martínez'],
          score: '6-4 5-7 6-4',
          winnerSide: 'B',
          dateLabel: '19 mar 2026',
          timeLabel: '10:00 hs',
          venueLabel: `${club} - Cancha 1`,
        },
        {
          id: `${categoryId}-qm2`,
          teamA: ['M. Rodríguez', 'S. Fernández'],
          teamB: ['C. Gómez', 'R. Sánchez'],
          score: '7-5 4-6 7-6',
          winnerSide: 'B',
          dateLabel: '20 mar 2026',
          timeLabel: '12:00 hs',
          venueLabel: `${club} - Cancha 2`,
        },
        {
          id: `${categoryId}-qm3`,
          teamA: ['D. Vargas', 'N. Acosta'],
          teamB: ['P. Vega', 'M. Costa'],
          score: '6-2 6-3',
          winnerSide: 'A',
          dateLabel: '21 mar 2026',
          timeLabel: '14:30 hs',
          venueLabel: `${club} - Cancha 1`,
        },
      ],
    },
    {
      id: `${categoryId}-zona-b`,
      name: 'Zona B',
      standings: [
        {
          id: `${categoryId}-sb1`,
          player1: 'Tomás Ruiz',
          player2: 'Luca Díaz',
          pj: 2,
          pg: 2,
          pp: 0,
          sg: 4,
          sp: 1,
          gg: 26,
          gp: 14,
        },
        {
          id: `${categoryId}-sb2`,
          player1: 'Pablo Vega',
          player2: 'Martín Costa',
          pj: 2,
          pg: 1,
          pp: 1,
          sg: 3,
          sp: 2,
          gg: 18,
          gp: 16,
        },
        {
          id: `${categoryId}-sb3`,
          player1: 'Diego Morales',
          player2: 'Facundo Ríos',
          pj: 2,
          pg: 0,
          pp: 2,
          sg: 1,
          sp: 4,
          gg: 9,
          gp: 22,
        },
      ],
      matches: [
        {
          id: `${categoryId}-qmb1`,
          teamA: ['T. Ruiz', 'L. Díaz'],
          teamB: ['P. Vega', 'M. Costa'],
          score: '6-3 6-4',
          winnerSide: 'A',
          dateLabel: '19 mar 2026',
          timeLabel: '11:30 hs',
          venueLabel: `${club} - Cancha 3`,
        },
        {
          id: `${categoryId}-qmb2`,
          teamA: ['D. Morales', 'F. Ríos'],
          teamB: ['T. Ruiz', 'L. Díaz'],
          score: '4-6 6-2 6-3',
          winnerSide: 'B',
          dateLabel: '20 mar 2026',
          timeLabel: '15:00 hs',
          venueLabel: `${club} - Cancha 2`,
        },
      ],
    },
  ]
}

export function compactQualifierZones(categoryId: string, pairs: [string, string][]): QualifierZone[] {
  return [
    {
      id: `${categoryId}-zona-a`,
      name: 'Zona A',
      standings: pairs.map(([player1, player2], index) => ({
        id: `${categoryId}-s${index + 1}`,
        player1,
        player2,
        pj: 2,
        pg: 2 - index,
        pp: index,
        sg: 4 - index,
        sp: 2 + index,
        gg: 20 - index * 4,
        gp: 8 + index * 4,
      })),
      matches: [],
    },
  ]
}
