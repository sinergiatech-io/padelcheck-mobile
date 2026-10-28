import { BRACKET_MATCH_CARD_HEIGHT, BRACKET_PAIR_GAP } from '@/features/events/components/bracket-layout.constants'
import type { BracketKnockoutMatch, BracketMatchPair, BracketRound } from '@/features/events/types'

export type MatchLayout = {
  match: BracketKnockoutMatch
  top: number
}

export type PairLayout = {
  pair: BracketMatchPair
  top: number
  height: number
  center: number
  matches: MatchLayout[]
}

export type RoundLayout = {
  round: BracketRound
  pairs: PairLayout[]
}

export type BracketLayout = {
  roundLayouts: RoundLayout[]
  contentHeight: number
}

function stackMatchesNaturally(matches: BracketKnockoutMatch[]): MatchLayout[] {
  return matches.map((match, index) => ({
    match,
    top: index * (BRACKET_MATCH_CARD_HEIGHT + BRACKET_PAIR_GAP),
  }))
}

function pairHeightFromMatches(matchCount: number): number {
  if (matchCount === 0) return 0
  if (matchCount === 1) return BRACKET_MATCH_CARD_HEIGHT
  return matchCount * BRACKET_MATCH_CARD_HEIGHT + (matchCount - 1) * BRACKET_PAIR_GAP
}

function matchCenter(pairLayout: PairLayout, matchLayout: MatchLayout): number {
  return pairLayout.top + matchLayout.top + BRACKET_MATCH_CARD_HEIGHT / 2
}

function flattenMatchCenters(pairs: PairLayout[]): number[] {
  return pairs.flatMap((pairLayout) =>
    pairLayout.matches.map((matchLayout) => matchCenter(pairLayout, matchLayout)),
  )
}

function layoutFirstRound(round: BracketRound): PairLayout[] {
  const pairs: PairLayout[] = []
  let y = 0

  for (const pair of round.pairs) {
    const matches = stackMatchesNaturally(pair.matches)
    const height = pairHeightFromMatches(pair.matches.length)
    pairs.push({
      pair,
      top: y,
      height,
      center: y + height / 2,
      matches,
    })
    y += height + BRACKET_PAIR_GAP
  }

  return pairs
}

type DerivedMatchPosition = {
  match: BracketKnockoutMatch
  center: number
  top: number
}

function layoutDerivedRound(round: BracketRound, previousPairs: PairLayout[]): PairLayout[] {
  const feederCenters = flattenMatchCenters(previousPairs)
  const derivedMatches: DerivedMatchPosition[] = []

  let feederIndex = 0
  for (const pair of round.pairs) {
    for (const match of pair.matches) {
      const feederA = feederCenters[feederIndex]
      const feederB = feederCenters[feederIndex + 1]
      feederIndex += 2

      if (feederA === undefined || feederB === undefined) continue

      const center = (feederA + feederB) / 2
      derivedMatches.push({
        match,
        center,
        top: center - BRACKET_MATCH_CARD_HEIGHT / 2,
      })
    }
  }

  let derivedIndex = 0
  return round.pairs.map((pair) => {
    const pairMatches = pair.matches.map(() => derivedMatches[derivedIndex++]).filter(Boolean)
    const tops = pairMatches.map((position) => position.top)
    const top = Math.min(...tops)
    const bottom = Math.max(...tops) + BRACKET_MATCH_CARD_HEIGHT
    const height = bottom - top
    const centers = pairMatches.map((position) => position.center)

    return {
      pair,
      top,
      height,
      center: (Math.min(...centers) + Math.max(...centers)) / 2,
      matches: pairMatches.map((position) => ({
        match: position.match,
        top: position.top - top,
      })),
    }
  })
}

function contentHeightFromPairs(pairs: PairLayout[]): number {
  if (pairs.length === 0) return 0
  const last = pairs[pairs.length - 1]
  return last.top + last.height
}

export function computeBracketLayout(rounds: BracketRound[]): BracketLayout {
  if (rounds.length === 0) {
    return { roundLayouts: [], contentHeight: 0 }
  }

  const roundLayouts: RoundLayout[] = []
  let previousPairs = layoutFirstRound(rounds[0])
  roundLayouts.push({ round: rounds[0], pairs: previousPairs })

  for (let index = 1; index < rounds.length; index++) {
    const pairs = layoutDerivedRound(rounds[index], previousPairs)
    roundLayouts.push({ round: rounds[index], pairs })
    previousPairs = pairs
  }

  const contentHeight = Math.max(...roundLayouts.map((layout) => contentHeightFromPairs(layout.pairs)))

  return { roundLayouts, contentHeight }
}

export function pairConnectorArms(pairLayout: PairLayout): number[] {
  return pairLayout.matches.map((match) => match.top + BRACKET_MATCH_CARD_HEIGHT / 2)
}
