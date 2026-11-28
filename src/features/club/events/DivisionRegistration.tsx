import { useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '@/components/ui/button'
import { PlayerPersonIcon } from '@/components/icons/PlayerPersonIcon'
import { EventIcon, push, s } from './EventShell'
import { Banner } from './division-ui'
import { CreatePlayerForm } from './CreatePlayerForm'
import { useCreateClubPair, useDivisionEntries, usePairPlayerSearch, type Entry, type EntryScope, type PairPlayer } from './club-pair-registration'

export function DivisionRegistration({ scope, open, admin, divisionTitle }: {
  scope: EntryScope; open: boolean; admin: boolean; divisionTitle: string
}) {
  const entries = useDivisionEntries(scope)
  const [showModal, setShowModal] = useState(false)
  const [result, setResult] = useState<Entry | null>(null)
  const active = entries.data?.filter(entry => entry.status !== 'CANCELLED')

  return <View className="gap-3">
    <Text accessibilityRole="header" className="font-inter-600 text-base text-dark-900">Inscripciones</Text>
    {result && (result.status === 'WAITLIST'
      ? <Banner tone="info" title="Pareja en lista de espera">La pareja quedó como suplente.</Banner>
      : <Banner tone="success" title="Pareja confirmada">La pareja ya está inscripta en esta división.</Banner>)}
    {entries.isPending && <Text accessibilityLiveRegion="polite" className="font-sans">Cargando inscripciones…</Text>}
    {entries.isError && <>
      <Banner tone="error" title="No pudimos cargar las inscripciones" />
      <Button variant="secondary" style={s.soft} onPress={() => void entries.refetch()}>Reintentar</Button>
    </>}
    {active?.length === 0 && <Text className="font-sans text-[#605e64]">Todavía no hay parejas inscriptas.</Text>}
    {!!active?.length && <View className="gap-2 rounded-lg border border-[#e7e7e8] bg-white p-3">
      {active.map(entry => <View key={entry.id} className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="font-inter-600 text-dark-900">{entry.displayName}</Text>
        <Text className="font-sans text-[#605e64]">{entry.status === 'WAITLIST' ? 'Lista de espera · ' + entry.waitlistPosition : 'Confirmada'}</Text>
      </View>)}
    </View>}
    {open && <Button style={s.button} onPress={() => { setResult(null); setShowModal(true) }}>Nueva inscripción</Button>}
    {showModal && <RegistrationDialog scope={scope} admin={admin && open} divisionTitle={divisionTitle} close={() => setShowModal(false)} done={entry => {
      setResult(entry)
      setShowModal(false)
      void entries.refetch()
    }} />}
  </View>
}

function RegistrationDialog({ scope, admin, divisionTitle, close, done }: {
  scope: EntryScope; admin: boolean; divisionTitle: string; close: () => void; done: (entry: Entry) => void
}) {
  const [inviteSlot, setInviteSlot] = useState<0 | 1 | null>(null)
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null)
  const inviting = useRef(false)
  const insets = useSafeAreaInsets()
  const { players, select, busy, submitting, error, submit } = useCreateClubPair(scope, done)
  function leaveInvitation() {
    if (!inviting.current) setInviteSlot(null)
  }
  function acceptInvite(player: PairPlayer, created: boolean) {
    if (inviteSlot === null) return
    select(inviteSlot, player)
    setSelectionNotice(created ? 'Jugador creado. Podés continuar con la inscripción.' : 'Jugador seleccionado.')
    setInviteSlot(null)
  }
  function dismiss() {
    if (submitting.current) return
    Keyboard.dismiss()
    if (inviteSlot !== null) leaveInvitation(); else close()
  }
  return <Modal transparent animationType="fade" onRequestClose={dismiss}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 items-center justify-center bg-black/40 px-3.5"
      style={{ paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }}>
      <View accessibilityViewIsModal className="w-full max-w-[374px] shrink overflow-hidden rounded-2xl bg-[#fefefe]">
        {inviteSlot !== null ? <CreatePlayerForm scope={scope} divisionTitle={divisionTitle} slot={inviteSlot}
          pending={inviting} teammateId={players[inviteSlot === 0 ? 1 : 0]?.playerId} close={dismiss} done={acceptInvite} /> : <>
        <View className="h-14 flex-row items-center justify-between border-b border-[#e5e5e5] pl-4 pr-2">
          <Text accessibilityRole="header" className="font-inter-600 text-sm text-dark-900">Nueva inscripción</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" disabled={busy} onPress={dismiss}
            className="h-9 w-9 items-center justify-center"><EventIcon name="modalClose" /></Pressable>
        </View>
        <ScrollView className="shrink" contentContainerStyle={{ gap: 32, padding: 24 }} keyboardShouldPersistTaps="handled">
          <Text className="font-sans text-xs text-[#605e64]">{divisionTitle} · Nueva pareja</Text>
          {error && <View className="gap-2">
            <Banner tone="error" title={error.title} icon={<EventIcon name="pairRejected" />}>{error.detail}</Banner>
            {error.planLimit && admin && <Pressable accessibilityRole="link" onPress={() => { dismiss(); push('/club/plan') }}
              className="self-center px-4 py-2"><Text className="font-inter-600 text-sm text-dark-900">Ver plan</Text></Pressable>}
          </View>}
          {selectionNotice && <Banner tone="success" title={selectionNotice} />}
          <PlayerSlot number={1} player={players[0]} excludeId={players[1]?.playerId} disabled={busy}
            create={admin ? () => setInviteSlot(0) : undefined} select={player => { select(0, player); setSelectionNotice(null) }} />
          <PlayerSlot number={2} player={players[1]} excludeId={players[0]?.playerId} disabled={busy}
            create={admin ? () => setInviteSlot(1) : undefined} select={player => { select(1, player); setSelectionNotice(null) }} />
        </ScrollView>
        <View className="mx-6 mb-7 flex-row gap-3 border-t border-[#e5e5e5] pt-4">
          <Button variant="secondary" className="h-10 flex-1 rounded-lg bg-[#e7e7e8]" disabled={busy} onPress={dismiss}>Cancelar</Button>
          <Button className="h-10 flex-1 rounded-lg disabled:bg-[#eef0c1] disabled:opacity-100"
            loading={busy} loadingLabel="Confirmando inscripción…" disabled={busy || !players[0] || !players[1]}
            onPress={() => { Keyboard.dismiss(); setSelectionNotice(null); void submit() }}>Confirmar</Button>
        </View>
        </>}
      </View>
    </KeyboardAvoidingView>
  </Modal>
}

function PlayerSlot({ number, player, excludeId, disabled, select, create }: {
  number: number; player: PairPlayer | null; excludeId?: string; disabled: boolean
  select: (player: PairPlayer | null) => void; create?: () => void
}) {
  const [query, setQuery] = useState('')
  const search = usePairPlayerSearch(query, excludeId, !player && !disabled)
  const results = search.data?.items.filter(item => item.playerId !== excludeId) ?? []
  return <View className="gap-4">
    <View className="flex-row items-center gap-2">
      <View className="h-6 w-6 items-center justify-center rounded-full bg-[#f8f8e5]">
        <Text className="font-sans text-xs text-[#919619]">{number}</Text>
      </View>
      <Text className="font-inter-600 text-sm text-dark-900">Jugador {number}</Text>
    </View>
    {player ? <View className="h-14 flex-row items-center gap-2 rounded-lg border border-[#b7bc33] bg-[#fafaeb] px-2">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-[#eef0c1]"><EventIcon name="pairPlayer" /></View>
      <Text numberOfLines={1} className="flex-1 font-inter-600 text-sm text-dark-900">{player.firstName} {player.lastName}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={'Quitar jugador ' + number} disabled={disabled}
        onPress={() => select(null)} className="h-9 w-9 items-center justify-center"><EventIcon name="modalClose" /></Pressable>
    </View> : <View className="gap-1">
      <View className="h-14 flex-row items-center gap-2 rounded-lg border border-[#b7bc33] px-4">
        <EventIcon name="pairSearch" />
        <TextInput accessibilityLabel={'Buscar jugador ' + number} value={query} onChangeText={setQuery} editable={!disabled}
          placeholder="Buscar jugador…" placeholderTextColor="#929195" autoCorrect={false} returnKeyType="search"
          className="flex-1 p-0 font-sans text-sm text-dark-900" />
      </View>
      {query.trim().length >= 2 && search.isFetching && <Text accessibilityLiveRegion="polite" className="p-2 font-sans">Buscando…</Text>}
      {search.isError && <Pressable accessibilityRole="button" className="p-2" onPress={() => void search.refetch()}>
        <Text className="font-sans text-sm underline">No pudimos buscar jugadores. Reintentar</Text>
      </Pressable>}
      {search.isSuccess && results.length === 0 && <View accessibilityLiveRegion="polite"
        className="mt-3 rounded-lg border border-[#e7e7e8] bg-[#f6f6f6] p-3">
        <Text className="font-inter-600 text-sm text-dark-900">Sin resultados</Text>
        <Text className="font-sans text-sm text-[#605e64]">No encontramos jugadores.</Text>
      </View>}
      {results.length > 0 && <View className="rounded-lg border border-[#e7e7e8]">
        {results.map(item => <Pressable key={item.playerId} accessibilityRole="button"
          onPress={() => { select(item); setQuery(''); Keyboard.dismiss() }} className="min-h-10 flex-row items-center gap-2 p-2">
          <PlayerPersonIcon size={16} />
          <View className="flex-1">
            <Text className="font-sans text-sm text-dark-900">{item.firstName} {item.lastName}</Text>
            {item.city && <Text className="font-sans text-xs text-[#605e64]">{item.city}</Text>}
          </View>
        </Pressable>)}
      </View>}
      {create && <Button variant="ghost" disabled={disabled} onPress={() => { Keyboard.dismiss(); create() }} className="mt-2">Crear jugador</Button>}
    </View>}
  </View>
}
