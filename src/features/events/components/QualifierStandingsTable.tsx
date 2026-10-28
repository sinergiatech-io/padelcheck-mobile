import { Text, View } from 'react-native'
import { QUALIFIER_STANDING_COLUMNS } from '@/features/events/api/qualifier.mock'
import type { QualifierStandingRow } from '@/features/events/types'

const STAT_COL_WIDTH = 26

function StandingsHeaderRow() {
  return (
    <View className="flex-row items-center bg-[#fafaeb] py-2.5">
      <View className="min-w-0 flex-1 px-4">
        <Text className="font-inter-600 text-body-sm text-primary-600">Pareja</Text>
      </View>
      {QUALIFIER_STANDING_COLUMNS.map((column) => (
        <View
          key={column.key}
          style={{ width: STAT_COL_WIDTH }}
          className="items-center justify-center"
        >
          <Text className="font-inter-600 text-body-sm text-primary-600">{column.label}</Text>
        </View>
      ))}
    </View>
  )
}

function StandingsDataRow({ row, isLast }: { row: QualifierStandingRow; isLast: boolean }) {
  return (
    <View
      className={`flex-row items-center ${isLast ? 'border-b border-[#dfdfdf]' : 'border-b border-[#e7e7e8]'}`}
    >
      <View className="min-h-[68px] min-w-0 flex-1 justify-center px-4 py-2.5">
        <Text className="font-inter-600 text-caption leading-5 text-dark-900" numberOfLines={1}>
          {row.player1}
        </Text>
        <Text className="font-inter-600 text-caption leading-5 text-dark-900" numberOfLines={1}>
          {row.player2}
        </Text>
      </View>
      {QUALIFIER_STANDING_COLUMNS.map((column) => (
        <View
          key={column.key}
          style={{ width: STAT_COL_WIDTH }}
          className="min-h-[68px] items-center justify-center"
        >
          <Text className="font-sans text-body-sm text-dark-900">{row[column.key]}</Text>
        </View>
      ))}
    </View>
  )
}

export function QualifierStandingsTable({ rows }: { rows: QualifierStandingRow[] }) {
  return (
    <View className="w-full bg-surface">
      <StandingsHeaderRow />
      {rows.map((row, index) => (
        <StandingsDataRow key={row.id} row={row} isLast={index === rows.length - 1} />
      ))}
    </View>
  )
}
