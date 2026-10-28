import { Link } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { ArrowForwardIcon, CalendarTodayIcon, LocationOnIcon } from '@/components/icons/TournamentCardIcons'
import type { EventStatus } from '@/features/events/types'
import { myTournamentCategoryPath } from '@/features/my-tournaments/my-tournament-routes'
import type { MyTournament } from '@/features/my-tournaments/types'
import { TournamentResultChip } from './TournamentResultChip'

type MyTournamentCardProps = {
  tournament: MyTournament
  variant: 'active' | 'history'
}

function statusBadgeVariant(status: EventStatus) {
  if (status === 'INSCRIPTION_OPEN') return 'primary' as const
  if (status === 'IN_PROGRESS' || status === 'FINISHED') return 'success' as const
  if (status === 'CANCELLED') return 'destructive' as const
  return 'neutral' as const
}

function statusLabel(status: EventStatus) {
  if (status === 'INSCRIPTION_OPEN') return 'Inscripciones abiertas'
  if (status === 'INSCRIPTION_CLOSED') return 'Cerrado'
  if (status === 'IN_PROGRESS') return 'Torneo en curso'
  if (status === 'FINISHED') return 'Finalizado'
  if (status === 'CANCELLED') return 'Cancelado'
  return 'Borrador'
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-inter-500 text-body-sm leading-8 text-[#605e64]">{label}</Text>
      <Text className="font-inter-600 text-body-sm leading-8 text-[#413f46]">{value}</Text>
    </View>
  )
}

function MetaRowLocation({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <LocationOnIcon size={24} color="#605E64" />
      <Text className="font-inter-500 text-caption leading-8 text-[#605e64]">{label}</Text>
    </View>
  )
}

function MetaRowDate({ label }: { label: string }) {
  return (
    <View className="h-6 flex-row items-center gap-2">
      <CalendarTodayIcon size={24} color="#605E64" />
      <Text className="font-inter-500 text-caption leading-6 text-[#605e64]">{label}</Text>
    </View>
  )
}

function CardBody({ tournament, variant }: MyTournamentCardProps) {
  return (
    <View className="overflow-hidden rounded-2xl border border-[#e7e7e8] bg-surface">
      <View className="px-4 pt-2">
        <View className="flex-row items-center justify-between py-2">
          <Text className="shrink font-inter-700 text-base leading-8 text-dark-900" numberOfLines={1}>
            {tournament.title}
          </Text>
          <Badge variant={statusBadgeVariant(tournament.status)} className="ml-2 shrink-0 rounded-lg px-2 py-1">
            {statusLabel(tournament.status)}
          </Badge>
        </View>
        <View className="pb-2">
          <Text className="font-inter-500 text-body-sm leading-8 text-[#605e64]">{tournament.club}</Text>
          <MetaRowLocation label={tournament.locationName} />
          <MetaRowDate label={tournament.dateLabel} />
        </View>
      </View>

      <View className="border-t border-[#b6b5b7] px-4 py-2">
        <DetailRow label="Categoría" value={tournament.categoryName} />
        <DetailRow label="Compañero" value={tournament.partnerName} />
        {variant === 'history' && tournament.result ? (
          <View className="flex-row items-center justify-between">
            <Text className="font-inter-500 text-body-sm leading-8 text-[#605e64]">Resultado</Text>
            <TournamentResultChip result={tournament.result} />
          </View>
        ) : null}
      </View>

      {variant === 'active' ? (
        <View className="flex-row items-center justify-between px-4 py-1">
          <Text className="font-inter-600 text-body-sm leading-8 text-primary-600">Ver detalles</Text>
          <ArrowForwardIcon size={24} color="#B7BC33" />
        </View>
      ) : null}
    </View>
  )
}

export function MyTournamentCard({ tournament, variant }: MyTournamentCardProps) {
  if (variant === 'active') {
    return (
      <Link href={myTournamentCategoryPath(tournament)} asChild>
        <Pressable accessibilityRole="button">
          <CardBody tournament={tournament} variant={variant} />
        </Pressable>
      </Link>
    )
  }

  return <CardBody tournament={tournament} variant={variant} />
}
