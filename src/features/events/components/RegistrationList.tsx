import { Pencil, Trash2 } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import { PlayerPersonIcon } from '@/components/icons/PlayerPersonIcon'
import { useEnrollmentModal } from '@/features/events/context/EnrollmentModalContext'
import type { Registration, RegistrationPlayer } from '../types'

function RegistrationPlayerCell({ player }: { player: RegistrationPlayer }) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-3">
      <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500/10">
        <PlayerPersonIcon size={20} color="#C9CF38" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-inter-600 text-body-sm leading-6 text-dark-900" numberOfLines={1}>
          {player.name}
        </Text>
        <Text className="font-sans text-caption leading-4 text-[#6b7280]" numberOfLines={1}>
          {player.location}
        </Text>
      </View>
    </View>
  )
}

type RegistrationPairItemProps = {
  registration: Registration
  rank: number
  showDivider: boolean
}

function RegistrationPairItem({ registration, rank, showDivider }: RegistrationPairItemProps) {
  const { openEdit } = useEnrollmentModal()

  return (
    <View className="gap-2 p-2">
      <Text className="font-inter-700 text-lg leading-7 text-primary-500">#{rank}</Text>
      <View className="flex-row gap-3 py-2">
        <RegistrationPlayerCell player={registration.players[0]} />
        <RegistrationPlayerCell player={registration.players[1]} />
      </View>
      {registration.isOwn ? (
        <View className="flex-row gap-4">
          <Pressable className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-[#fdecec] px-2 py-2">
            <Trash2 size={24} color="#D93E3E" />
            <Text className="font-sans text-body-sm font-medium text-[#d93e3e]">Eliminar</Text>
          </Pressable>
          <Pressable
            onPress={() => openEdit(registration)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-[#fef5e7] px-2 py-2"
          >
            <Pencil size={24} color="#DF900A" />
            <Text className="font-sans text-body-sm font-medium text-[#df900a]">Editar</Text>
          </Pressable>
        </View>
      ) : null}
      {showDivider ? <View className="h-px w-full bg-[#e7e7e8]" /> : null}
    </View>
  )
}

export function RegistrationList({ registrations }: { registrations: Registration[] }) {
  return (
    <View className="w-full gap-2 rounded-2xl border border-[#e7e7e8] bg-surface p-2">
      {registrations.map((registration, index) => (
        <RegistrationPairItem
          key={registration.id}
          registration={registration}
          rank={index + 1}
          showDivider={index < registrations.length - 1}
        />
      ))}
    </View>
  )
}
