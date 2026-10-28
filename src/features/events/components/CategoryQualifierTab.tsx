import { Text, View } from 'react-native'
import { TrophyOutlineIcon } from '@/components/icons/TrophyIcon'
import { QualifierMatchCard } from '@/features/events/components/QualifierMatchCard'
import { QualifierStandingsTable } from '@/features/events/components/QualifierStandingsTable'
import type { QualifierZone } from '@/features/events/types'

export function QualifierZoneSection({ zone }: { zone: QualifierZone }) {
  return (
    <View className="gap-2">
      <View className="overflow-hidden rounded-2xl border border-[#e7e7e8] bg-surface">
        <View className="flex-row items-center gap-3 border-b border-[#e5e5e5] bg-[#f9fafb] px-4 py-3">
          <TrophyOutlineIcon size={20} color="#C9CF38" />
          <Text className="font-inter-600 text-body-sm text-dark-900">{zone.name}</Text>
        </View>
        <QualifierStandingsTable rows={zone.standings} />
      </View>
      {zone.matches.map((match) => (
        <QualifierMatchCard key={match.id} match={match} />
      ))}
    </View>
  )
}

export function CategoryQualifierTab({ zones }: { zones: QualifierZone[] }) {
  if (zones.length === 0) {
    return (
      <View className="rounded-2xl border border-[#e7e7e8] bg-surface p-4">
        <Text className="font-sans text-body-sm text-[#605e64]">Sin datos de clasificatoria.</Text>
      </View>
    )
  }

  return (
    <View className="gap-2">
      {zones.map((zone) => (
        <QualifierZoneSection key={zone.id} zone={zone} />
      ))}
    </View>
  )
}
