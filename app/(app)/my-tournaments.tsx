import { useState } from 'react'
import { Text, View } from 'react-native'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { MyTournamentCard } from '@/features/my-tournaments/components/MyTournamentCard'
import { MyTournamentsMobileHeader } from '@/features/my-tournaments/components/MyTournamentsMobileHeader'
import { MyTournamentsTabs } from '@/features/my-tournaments/components/MyTournamentsTabs'
import { useMyTournamentsQuery } from '@/features/my-tournaments/hooks/use-my-tournaments-query'
import type { MyTournamentTab } from '@/features/my-tournaments/types'
import { useRefreshControl } from '@/hooks/use-refresh-control'

export default function MyTournamentsScreen() {
  const [activeTab, setActiveTab] = useState<MyTournamentTab>('activos')
  const { active, history, reload } = useMyTournamentsQuery()
  const { refreshing, onRefresh } = useRefreshControl(reload)

  const tournaments = activeTab === 'activos' ? active : history
  const variant = activeTab === 'activos' ? 'active' : 'history'

  return (
    <View className="flex-1 bg-[#f7f7f7]">
      <MyTournamentsMobileHeader />
      <MyTournamentsTabs activeTab={activeTab} onChange={setActiveTab} />
      <RefreshableScrollView
        className="flex-1"
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 96, gap: 8 }}
      >
        {tournaments.length === 0 ? (
          <Text className="font-sans text-body-sm text-[#605e64]">
            {activeTab === 'activos' ? 'No tenés torneos activos.' : 'No hay torneos en tu historial.'}
          </Text>
        ) : (
          tournaments.map((tournament) => (
            <MyTournamentCard key={tournament.id} tournament={tournament} variant={variant} />
          ))
        )}
      </RefreshableScrollView>
    </View>
  )
}
