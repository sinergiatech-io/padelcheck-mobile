import type { BracketKnockoutMatch, BracketRound } from '@/features/events/types'

function team(player1: string, player2: string, sets: [number, number, number]) {
  return { player1, player2, sets }
}

function knockoutMatch(
  id: string,
  teamA: ReturnType<typeof team>,
  teamB: ReturnType<typeof team>,
  winnerSide: 'A' | 'B',
  dateLabel: string,
  timeLabel: string,
  venueLabel: string,
): BracketKnockoutMatch {
  return { id, teamA, teamB, winnerSide, dateLabel, timeLabel, venueLabel }
}

/** Cuadro eliminatorio alineado a Figma 467:3246 (Copa Necochea · Caballeros 1). */
export function defaultBracketRounds(categoryId: string, club = 'Club Central'): BracketRound[] {
  const venue = (court: number) => `${club} - Cancha ${court}`

  const qf1 = knockoutMatch(
    `${categoryId}-qf1`,
    team('A. Pérez', 'L. López', [0, 6, 0]),
    team('M. Rodríguez', 'S. Fernández', [6, 0, 6]),
    'B',
    '19 mar 2026',
    '10:00 hs',
    venue(1),
  )
  const qf2 = knockoutMatch(
    `${categoryId}-qf2`,
    team('J. Pérez', 'C. López', [6, 4, 6]),
    team('M. Iriarte', 'L. Benítez', [4, 6, 3]),
    'A',
    '19 mar 2026',
    '11:30 hs',
    venue(2),
  )
  const qf3 = knockoutMatch(
    `${categoryId}-qf3`,
    team('D. Vargas', 'E. Molina', [6, 3, 6]),
    team('F. Castillo', 'L. Herrera', [3, 6, 2]),
    'A',
    '20 mar 2026',
    '10:00 hs',
    venue(3),
  )
  const qf4 = knockoutMatch(
    `${categoryId}-qf4`,
    team('C. Gómez', 'R. Sánchez', [7, 6, 0]),
    team('P. Vega', 'M. Costa', [5, 4, 0]),
    'A',
    '20 mar 2026',
    '12:00 hs',
    venue(1),
  )

  const sf1 = knockoutMatch(
    `${categoryId}-sf1`,
    team('M. Rodríguez', 'S. Fernández', [4, 6, 3]),
    team('J. Pérez', 'C. López', [6, 4, 6]),
    'B',
    '21 mar 2026',
    '14:00 hs',
    venue(2),
  )
  const sf2 = knockoutMatch(
    `${categoryId}-sf2`,
    team('D. Vargas', 'E. Molina', [6, 6, 0]),
    team('C. Gómez', 'R. Sánchez', [2, 4, 0]),
    'A',
    '21 mar 2026',
    '16:00 hs',
    venue(3),
  )

  const finalMatch = knockoutMatch(
    `${categoryId}-f1`,
    team('J. Pérez', 'C. López', [6, 3, 6]),
    team('D. Vargas', 'E. Molina', [4, 6, 4]),
    'A',
    '22 mar 2026',
    '18:00 hs',
    venue(1),
  )

  return [
    {
      id: `${categoryId}-cuartos`,
      name: 'Cuartos de final',
      variant: 'primary',
      pairs: [
        { id: `${categoryId}-qf-p1`, matches: [qf1, qf2], connector: 'double' },
        { id: `${categoryId}-qf-p2`, matches: [qf3, qf4], connector: 'double' },
      ],
    },
    {
      id: `${categoryId}-semi`,
      name: 'Semifinal',
      variant: 'neutral',
      pairs: [{ id: `${categoryId}-sf-p1`, matches: [sf1, sf2], connector: 'semi' }],
    },
    {
      id: `${categoryId}-final`,
      name: 'Final',
      variant: 'primary',
      pairs: [{ id: `${categoryId}-f-p1`, matches: [finalMatch] }],
    },
  ]
}

/** Cuadro compacto para categorías pequeñas. */
export function compactBracketRounds(
  categoryId: string,
  pairs: [[string, string], [string, string]],
  club = 'Club Central',
): BracketRound[] {
  const venue = `${club} - Cancha 1`
  const semi = knockoutMatch(
    `${categoryId}-sf1`,
    team(pairs[0][0], pairs[0][1], [6, 6, 0]),
    team(pairs[1][0], pairs[1][1], [2, 4, 0]),
    'A',
    '19 mar 2026',
    '10:00 hs',
    venue,
  )

  return [
    {
      id: `${categoryId}-semi`,
      name: 'Semifinal',
      variant: 'primary',
      pairs: [{ id: `${categoryId}-sf-p1`, matches: [semi] }],
    },
  ]
}
