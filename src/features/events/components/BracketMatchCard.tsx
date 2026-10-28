import { CalendarDays, Clock, MapPin } from 'lucide-react-native'
import { Text, View } from 'react-native'
import type { BracketKnockoutMatch, BracketTeamRow } from '@/features/events/types'

const BORDER = '#676767'
const SCORE_COL_WIDTH = 28
const NAMES_COL_WIDTH = 204
const ROW_HEIGHT = 52
const CARD_WIDTH = 288

function isSetWinner(setIndex: number, side: 'A' | 'B', teamA: BracketTeamRow, teamB: BracketTeamRow) {
  const scoreA = teamA.sets[setIndex]
  const scoreB = teamB.sets[setIndex]
  if (scoreA === scoreB) return false
  return side === 'A' ? scoreA > scoreB : scoreB > scoreA
}

function TeamNames({ team, isWinner }: { team: BracketTeamRow; isWinner: boolean }) {
  const nameClass = isWinner ? 'font-inter-600 text-[#8f9328]' : 'font-sans text-dark-900'

  return (
    <>
      <Text className={`text-body-sm leading-[18px] ${nameClass}`} numberOfLines={1}>
        {team.player1}
      </Text>
      <Text className={`text-body-sm leading-[18px] ${nameClass}`} numberOfLines={1}>
        {team.player2}
      </Text>
    </>
  )
}

function ScoreRow({
  team,
  opponent,
  side,
  isWinner,
  showBottomBorder,
}: {
  team: BracketTeamRow
  opponent: BracketTeamRow
  side: 'A' | 'B'
  isWinner: boolean
  showBottomBorder: boolean
}) {
  const teamA = side === 'A' ? team : opponent
  const teamB = side === 'B' ? team : opponent

  return (
    <View
      className="flex-row"
      style={{
        height: ROW_HEIGHT,
        borderBottomWidth: showBottomBorder ? 1 : 0,
        borderColor: BORDER,
      }}
    >
      <View
        className="justify-center p-2"
        style={{
          width: NAMES_COL_WIDTH,
          height: ROW_HEIGHT,
          borderRightWidth: 1,
          borderColor: BORDER,
        }}
      >
        <TeamNames team={team} isWinner={isWinner} />
      </View>
      {team.sets.map((score, index) => (
        <View
          key={index}
          className="items-center justify-center p-2"
          style={{
            width: SCORE_COL_WIDTH,
            height: ROW_HEIGHT,
            borderRightWidth: index < 2 ? 1 : 0,
            borderColor: BORDER,
          }}
        >
          <Text
            className={`text-body-sm leading-[18px] text-dark-900 ${isSetWinner(index, side, teamA, teamB) ? 'font-inter-600' : 'font-sans'}`}
          >
            {score}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function BracketMatchCard({ match }: { match: BracketKnockoutMatch }) {
  return (
    <View
      className="overflow-hidden rounded-2xl bg-surface"
      style={{ width: CARD_WIDTH, borderWidth: 1, borderColor: BORDER }}
    >
      <ScoreRow
        team={match.teamA}
        opponent={match.teamB}
        side="A"
        isWinner={match.winnerSide === 'A'}
        showBottomBorder
      />
      <ScoreRow
        team={match.teamB}
        opponent={match.teamA}
        side="B"
        isWinner={match.winnerSide === 'B'}
        showBottomBorder
      />
      <View className="p-2">
        <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
          <View className="flex-row items-center gap-2">
            <CalendarDays size={16} color="#676767" />
            <Text className="font-sans text-body-sm text-[#676767]">{match.dateLabel}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Clock size={16} color="#676767" />
            <Text className="font-sans text-body-sm text-[#676767]">{match.timeLabel}</Text>
          </View>
        </View>
        <View className="mt-1 flex-row items-center gap-2">
          <MapPin size={16} color="#676767" />
          <Text className="flex-1 font-sans text-body-sm text-[#676767]" numberOfLines={1}>
            {match.venueLabel}
          </Text>
        </View>
      </View>
    </View>
  )
}
