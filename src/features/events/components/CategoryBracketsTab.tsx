import { ScrollView, Text, View } from 'react-native'
import { BRACKET_COLUMN_WIDTH, BRACKET_MATCHS_WIDTH } from '@/features/events/components/bracket-layout.constants'
import { BracketConnector } from '@/features/events/components/BracketConnector'
import { BracketMatchCard } from '@/features/events/components/BracketMatchCard'
import {
  computeBracketLayout,
  pairConnectorArms,
  type PairLayout,
  type RoundLayout,
} from '@/features/events/components/compute-bracket-layout'
import type { BracketRound } from '@/features/events/types'

function BracketPairRow({ pairLayout }: { pairLayout: PairLayout }) {
  const arms = pairConnectorArms(pairLayout)

  return (
    <View
      className="flex-row items-stretch px-4"
      style={{ position: 'absolute', top: pairLayout.top, left: 0, right: 0, height: pairLayout.height }}
    >
      <View style={{ width: BRACKET_MATCHS_WIDTH, height: pairLayout.height }} className="px-2">
        {pairLayout.matches.map((matchLayout) => (
          <View
            key={matchLayout.match.id}
            style={{ position: 'absolute', top: matchLayout.top, left: 8, right: 8 }}
          >
            <BracketMatchCard match={matchLayout.match} />
          </View>
        ))}
      </View>
      {pairLayout.pair.connector ? (
        <View className="shrink-0 justify-center">
          <BracketConnector height={pairLayout.height} arms={arms} />
        </View>
      ) : null}
    </View>
  )
}

function BracketRoundColumn({ roundLayout, contentHeight }: { roundLayout: RoundLayout; contentHeight: number }) {
  const bgClass = roundLayout.round.variant === 'primary' ? 'bg-[#FAFAEB]' : 'bg-surface'

  return (
    <View className={`py-4 ${bgClass}`} style={{ width: BRACKET_COLUMN_WIDTH }}>
      <View className="items-center px-4 pb-4">
        <Text className="font-inter-600 text-body uppercase text-[#8f9328]">{roundLayout.round.name}</Text>
      </View>
      <View style={{ height: contentHeight, position: 'relative' }}>
        {roundLayout.pairs.map((pairLayout) => (
          <BracketPairRow key={pairLayout.pair.id} pairLayout={pairLayout} />
        ))}
      </View>
    </View>
  )
}

export function CategoryBracketsTab({ rounds }: { rounds: BracketRound[] }) {
  if (rounds.length === 0) {
    return (
      <View className="rounded-2xl border border-[#e7e7e8] bg-surface p-4">
        <Text className="font-sans text-body-sm text-[#605e64]">Sin datos de cuadros.</Text>
      </View>
    )
  }

  const { roundLayouts, contentHeight } = computeBracketLayout(rounds)

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4">
      <View className="flex-row items-start">
        {roundLayouts.map((roundLayout) => (
          <BracketRoundColumn
            key={roundLayout.round.id}
            roundLayout={roundLayout}
            contentHeight={contentHeight}
          />
        ))}
      </View>
    </ScrollView>
  )
}
