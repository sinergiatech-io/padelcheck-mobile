import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CircleX, Search } from 'lucide-react-native'
import { Button } from '@/components/ui/button'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { ArrowForwardIcon } from '@/components/icons/TournamentCardIcons'
import { useRefreshControl } from '@/hooks/use-refresh-control'
import { categoryLabel, genderOptions, usePlayerSearch } from '@/features/players/use-player-search'
import type { GenderFilter } from '@/features/players/use-player-search'

function Filter({ current, label, onPress }: { current: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: current }} onPress={onPress}
    className={'h-[34px] shrink-0 justify-center rounded-full border px-3 ' + (current ? 'border-[#C9CF38] bg-[#f8f9e9]' : 'border-[#b6b5b7] bg-white')}>
    <Text className="font-inter-500 text-xs text-[#605e64]">{label}</Text>
  </Pressable>
}

export default function PlayersScreen() {
  const [query, setQuery] = useState('')
  const [gender, setGender] = useState<GenderFilter>()
  const [categoryId, setCategory] = useState<string>()
  const { categories, results, active, refreshFirstPage, rows } = usePlayerSearch({ query, gender, categoryId })
  const { refreshing, onRefresh } = useRefreshControl(refreshFirstPage)
  const categoryOptions = categories.data?.slice().reverse()

  function handleRefresh() {
    if (active && !results.isFetching && !refreshing) void onRefresh()
  }

  return <View className="flex-1 bg-[#f2f2f3]">
    <SafeAreaView edges={['top']} className="bg-[#120F18]">
      <Text accessibilityRole="header" className="px-4 py-4 font-inter-700 text-xl text-white">Jugadores</Text>
    </SafeAreaView>
    <View className="gap-2 px-4 pb-3 pt-3">
      <View className="flex-row items-center gap-2 rounded-lg border border-[#b6b5b7] bg-white px-4">
        <Search size={16} color="#929195" />
        <TextInput autoCorrect={false} maxLength={128} accessibilityLabel="Buscar jugadores"
          placeholder="Buscar jugadores…" placeholderTextColor="#929195" value={query} onChangeText={setQuery}
          className="h-[46px] flex-1 font-inter-500 text-sm text-[#120F18]" />
      </View>
      <View className="flex-row gap-2">
        {genderOptions.map(option => <Filter key={option.label} label={option.label} current={gender === option.value}
          onPress={() => setGender(option.value)} />)}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8 }}>
        <Filter label="Todos" current={!categoryId} onPress={() => setCategory(undefined)} />
        {categoryOptions?.map(category => <Filter key={category.id} label={category.name}
          current={categoryId === category.id} onPress={() => setCategory(category.id)} />)}
      </ScrollView>
      {categories.isError && <View className="flex-row items-center justify-between">
        <Text className="font-sans text-sm">No pudimos cargar las categorías.</Text>
        <Button variant="ghost" onPress={() => { void categories.refetch() }}>Reintentar</Button>
      </View>}
    </View>
    <RefreshableScrollView alwaysBounceVertical={active} refreshing={refreshing} onRefresh={handleRefresh}
      keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 }}>
      {!active && <Text className="py-5 font-sans text-sm text-[#605e64]">Buscá por nombre o elegí un filtro.</Text>}
      {active && results.isPending && <View accessible accessibilityLabel="Buscando jugadores" className="gap-2">
        {[1, 2, 3, 4, 5].map(id => <View key={id} className="h-[66px] flex-row items-center gap-3 rounded-xl border border-divider bg-white px-3">
          <View className="h-10 w-10 rounded-full bg-divider" />
          <View className="gap-2">
            <View className="h-3.5 w-[140px] rounded bg-divider" />
            <View className="h-2.5 w-[90px] rounded bg-divider" />
          </View>
        </View>)}
      </View>}
      {active && results.isError && <View className="pb-3">
        <View className="items-center gap-1 rounded-2xl border border-divider bg-white p-2">
          <CircleX size={20} color="#605E64" />
          <Text accessibilityLiveRegion="polite" className="text-center font-inter-500 text-sm text-[#605e64]">No pudimos cargar jugadores</Text>
          <Text className="max-w-[176px] font-sans text-xs text-muted-foreground">Revisá tu conexión e intentá de nuevo.</Text>
        </View>
        <Button className="mt-3 h-10 rounded-lg" loading={results.isFetching} onPress={handleRefresh}>Reintentar</Button>
      </View>}
      {active && results.isSuccess && !rows.length && <View className="min-h-[106px] items-center justify-center gap-1 rounded-2xl border border-divider bg-white p-2">
        <Search size={20} color="#605E64" />
        <Text className="font-inter-500 text-sm text-[#605e64]">Sin resultados</Text>
        <Text className="max-w-[176px] font-sans text-xs text-muted-foreground">Probá con otro nombre o cambiá los filtros.</Text>
      </View>}
      <View className="overflow-hidden rounded-t-xl">
        {rows.map(player => <Pressable key={player.playerId} accessibilityRole="link"
          onPress={() => router.push('/player/' + player.playerId)}
          className="min-h-16 flex-row items-center gap-3 border-b border-[#f2f2f3] bg-white px-3 py-2">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-[#C9CF38]">
            <Text className="font-inter-600 text-sm text-white">{(player.firstName.slice(0, 1) + player.lastName.slice(0, 1)).toUpperCase()}</Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-inter-600 text-sm">{player.firstName} {player.lastName}</Text>
            <Text className="font-sans text-xs text-[#605e64]">{categoryLabel(player)}</Text>
          </View>
          <ArrowForwardIcon size={20} color="#605E64" />
        </Pressable>)}
      </View>
      {rows.length > 0 && results.hasNextPage && <Button variant="secondary" className="mt-3"
        disabled={results.isFetching} loading={results.isFetchingNextPage}
        onPress={() => { void results.fetchNextPage({ cancelRefetch: false }) }}>Ver más</Button>}
    </RefreshableScrollView>
  </View>
}
