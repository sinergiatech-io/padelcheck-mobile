import { Text, View } from 'react-native'
import type { MyTournamentResult } from '../types'

const RESULT_META: Record<MyTournamentResult, { label: string; color: string }> = {
  campeon: { label: 'Campeón', color: '#1fb356' },
  final: { label: 'Final', color: '#b7bc33' },
  semifinal: { label: 'Semifinal', color: '#605e64' },
  cuartos: { label: 'Cuartos', color: '#605e64' },
}

export function TournamentResultChip({ result }: { result: MyTournamentResult }) {
  const meta = RESULT_META[result]
  return (
    <View className="rounded-lg p-1">
      <Text className="font-inter-500 text-body-sm" style={{ color: meta.color }}>
        {meta.label}
      </Text>
    </View>
  )
}
