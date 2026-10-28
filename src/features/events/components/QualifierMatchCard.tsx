import { CalendarDays, Clock, MapPin } from 'lucide-react-native'
import { Text, View } from 'react-native'
import type { QualifierMatch } from '@/features/events/types'

function TeamNames({
  names,
  isWinner,
}: {
  names: [string, string]
  isWinner: boolean
}) {
  return (
    <View className="min-w-[88px] shrink">
      <Text
        className={`font-inter-600 text-body-sm leading-[27px] ${isWinner ? 'text-[#7a7d24]' : 'text-dark-900'}`}
        numberOfLines={1}
      >
        {names[0]}
      </Text>
      <Text
        className={`font-inter-600 text-body-sm leading-[27px] ${isWinner ? 'text-[#7a7d24]' : 'text-dark-900'}`}
        numberOfLines={1}
      >
        {names[1]}
      </Text>
    </View>
  )
}

export function QualifierMatchCard({ match }: { match: QualifierMatch }) {
  return (
    <View className="rounded-2xl border border-[#e7e7e8] bg-surface p-2">
      <View className="flex-row items-center justify-between px-4 py-2">
        <TeamNames names={match.teamA} isWinner={match.winnerSide === 'A'} />
        <View className="items-center gap-1.5 px-2">
          <Text className="font-sans text-caption text-dark-900">vs</Text>
          <Text className="text-center font-inter-600 text-body-sm text-dark-900">{match.score}</Text>
        </View>
        <TeamNames names={match.teamB} isWinner={match.winnerSide === 'B'} />
      </View>
      <View className="gap-2 px-4 pb-2 pt-1">
        <View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
          <View className="flex-row items-center gap-2">
            <CalendarDays size={16} color="#6b7280" />
            <Text className="font-sans text-body-sm text-[#6b7280]">{match.dateLabel}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Clock size={16} color="#6b7280" />
            <Text className="font-sans text-body-sm text-[#6b7280]">{match.timeLabel}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <MapPin size={16} color="#6b7280" />
          <Text className="flex-1 font-sans text-body-sm text-[#6b7280]" numberOfLines={1}>
            {match.venueLabel}
          </Text>
        </View>
      </View>
    </View>
  )
}
