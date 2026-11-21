import { router, useLocalSearchParams } from 'expo-router'
import { Text, View } from 'react-native'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { Button } from '@/components/ui/button'
import { MyTournamentCard } from '@/features/my-tournaments/components/MyTournamentCard'
import { MyTournamentsMobileHeader } from '@/features/my-tournaments/components/MyTournamentsMobileHeader'
import { MyTournamentsTabs } from '@/features/my-tournaments/components/MyTournamentsTabs'
import { useMyTournamentsQuery } from '@/features/my-tournaments/hooks/use-my-tournaments-query'
import type { MyTournamentTab } from '@/features/my-tournaments/types'
import { useRefreshControl } from '@/hooks/use-refresh-control'

export default function MyTournamentsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>()
  const activeTab: MyTournamentTab = tab === 'historial' ? 'historial' : 'activos'
  const query = useMyTournamentsQuery(activeTab)
  const { refreshing, onRefresh } = useRefreshControl(async () => { await query.refetch({ cancelRefetch: false }) })
  const variant = activeTab === 'activos' ? 'active' : 'history'

  return (
    <View className="flex-1 bg-[#f7f7f7]">
      <MyTournamentsMobileHeader />
      <MyTournamentsTabs activeTab={activeTab} onChange={selected => router.setParams({ tab: selected })} />
      <RefreshableScrollView
        className="flex-1"
        refreshing={refreshing}
        onRefresh={onRefresh}
        alwaysBounceVertical
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 8, flexGrow: 1 }}
      >
        {query.isPending && <Text accessibilityLiveRegion="polite" className="font-sans text-body-sm">Cargando torneos…</Text>}
        {query.isError && <View>
          <Text accessibilityLiveRegion="polite" className="font-sans text-body-sm">No pudimos cargar los torneos.</Text>
          <Button variant="ghost" onPress={() => { void query.refetch() }}>Reintentar</Button>
        </View>}
        {query.isSuccess && query.rows.length === 0 ? (
          <Text className="font-sans text-body-sm text-[#605e64]">
            {activeTab === 'activos' ? 'No tenés torneos activos.' : 'No hay torneos en tu historial.'}
          </Text>
        ) : (
          query.rows.map((tournament) => (
            <MyTournamentCard key={tournament.id} tournament={tournament} variant={variant} />
          ))
        )}
        {query.hasNextPage && <Button variant="secondary" loading={query.isFetchingNextPage}
          onPress={() => { void query.fetchNextPage() }}>Ver más</Button>}
      </RefreshableScrollView>
    </View>
  )
}
