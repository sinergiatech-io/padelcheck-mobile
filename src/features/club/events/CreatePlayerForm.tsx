import { useState } from 'react'
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { EventIcon } from './EventShell'
import { Banner } from './division-ui'
import type { EntryScope, PairPlayer } from './club-pair-registration'
import { ineligibilityDetail, invitationGenders, invitationLabels, useClubPlayerInvitation } from './club-player-invitation'

const fields = ['firstName', 'lastName', 'email'] as const
const selects = ['gender', 'categoryId'] as const
const placeholders = { firstName: 'Ingresá su nombre', lastName: 'Ingresá su apellido', email: 'nombre@ejemplo.com' }
const fieldClass = 'h-14 rounded-lg border bg-[#fefefe] px-4 font-sans text-sm text-dark-900 '

export function CreatePlayerForm({ scope, divisionTitle, slot, teammateId, pending, close, done }: {
  scope: EntryScope; divisionTitle: string; slot: 0 | 1; teammateId?: string; pending: { current: boolean }
  close: () => void; done: (player: PairPlayer, created: boolean) => void
}) {
  const invite = useClubPlayerInvitation(scope, teammateId, pending, done)
  const { busy, catalog, draft, errors, result } = invite
  const [picker, setPicker] = useState<(typeof selects)[number] | null>(null)
  const existing = result?.outcome === 'EXISTING_PLAYER' ? result.player : null
  const blocked = result && !existing
  const info = <EventIcon name="inviteInfo" />
  const options = {
    gender: invitationGenders,
    categoryId: catalog.data?.map(category => ({ value: category.id, label: category.name })) ?? [],
  }

  function submit() {
    Keyboard.dismiss()
    setPicker(null)
    if (existing) invite.selectExisting()
    else void invite.submit()
  }

  return <>
    <View className="h-14 flex-row items-center justify-between border-b border-[#e5e5e5] pl-4 pr-2">
      <Text accessibilityRole="header" className="font-inter-600 text-sm text-dark-900">Crear jugador</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" disabled={busy} onPress={close}
        className="h-9 w-9 items-center justify-center"><EventIcon name="modalClose" /></Pressable>
    </View>
    <ScrollView className="shrink" contentContainerStyle={{ gap: 16, padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text className="font-sans text-xs text-[#605e64]">{divisionTitle} · Jugador {slot + 1}</Text>
      {existing ? <>
        <Banner tone="info" icon={info} title="Ya existe un jugador con este email">
          Podés seleccionarlo para continuar. Sus datos y categoría global se conservan.
        </Banner>
        <View className="h-14 flex-row items-center gap-2 rounded-lg border border-[#b7bc33] bg-[#fafaeb] px-2">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-[#eef0c1]"><EventIcon name="pairPlayer" /></View>
          <Text numberOfLines={1} className="flex-1 font-inter-600 text-sm text-dark-900">{existing.firstName} {existing.lastName}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Editar email" onPress={invite.edit}
            className="h-9 w-9 items-center justify-center"><EventIcon name="modalClose" /></Pressable>
        </View>
        <View><Text className="font-sans text-xs text-dark-900">{draft.email}</Text>
          <Text className="font-sans text-xs text-dark-900">{invitationGenders.find(option => option.value === existing.gender)?.label}
            {existing.baseCategoryName && ' · ' + existing.baseCategoryName}</Text></View>
      </> : blocked ? <>
        {result.outcome === 'ACCOUNT_WITHOUT_PLAYER' && <Banner tone="blocked" title="Este email ya tiene una cuenta">
          Su titular debe completar el registro como jugador.
        </Banner>}
        {result.outcome === 'BLOCKED' && <Banner tone="blocked" title="Jugador bloqueado">
          Esta cuenta o perfil no está habilitado para inscribirse.
        </Banner>}
        {result.outcome === 'INELIGIBLE' && <Banner tone="error" title="Jugador no elegible">{ineligibilityDetail(result.reason)}</Banner>}
        <Button variant="secondary" onPress={invite.edit}>Editar email</Button>
      </> : <>
        {invite.error && <Banner tone="error" title="No pudimos guardar">{invite.error}</Banner>}
        {fields.map(key => <View key={key} className="gap-2">
          <Text className="font-inter-500 text-sm text-dark-900">{invitationLabels[key]} <Text className="text-red-600">*</Text></Text>
          <TextInput accessibilityLabel={invitationLabels[key]} maxLength={key === 'email' ? 254 : 100}
            className={fieldClass + (errors[key] ? 'border-red-500' : 'border-[#929195]')}
            value={draft[key]} onChangeText={value => invite.setField(key, value)} placeholder={placeholders[key]}
            placeholderTextColor="#605E64" editable={!busy} autoCapitalize={key === 'email' ? 'none' : 'words'}
            keyboardType={key === 'email' ? 'email-address' : 'default'} autoCorrect={false} />
          {errors[key] && <Text accessibilityRole="alert" className="font-sans text-xs text-red-700">{errors[key]}</Text>}
        </View>)}
        {selects.map(key => <View key={key} className="gap-2">
          <Text className="font-inter-500 text-sm text-dark-900">{invitationLabels[key]} <Text className="text-red-600">*</Text></Text>
          <Pressable accessibilityRole="button" accessibilityLabel={invitationLabels[key]} accessibilityState={{ expanded: picker === key }}
            disabled={busy || key === 'categoryId' && !catalog.data}
            className={fieldClass + ' flex-row items-center justify-between ' + (errors[key] ? 'border-red-500' : 'border-[#929195]')}
            onPress={() => { Keyboard.dismiss(); setPicker(picker === key ? null : key) }}>
            <Text className="font-sans text-sm text-[#605e64]">
              {options[key].find(option => option.value === draft[key])?.label ??
                (key === 'categoryId' && catalog.isPending ? 'Cargando categorías…' : 'Seleccionar')}
            </Text>
            <EventIcon name="inviteChevron" />
          </Pressable>
          {picker === key && <View className="rounded-lg border border-[#e7e7e8]">
            {options[key].map(option => <Pressable key={option.value} accessibilityRole="button"
              accessibilityState={{ selected: draft[key] === option.value }} className="min-h-11 justify-center px-4"
              onPress={() => { invite.setField(key, option.value); setPicker(null) }}>
              <Text className="font-sans text-sm text-dark-900">{option.label}</Text>
            </Pressable>)}
          </View>}
          {errors[key] && <Text accessibilityRole="alert" className="font-sans text-xs text-red-700">{errors[key]}</Text>}
        </View>)}
        {catalog.isError && <>
          <Banner tone="error" title="No pudimos cargar las categorías" />
          <Button variant="secondary" onPress={() => void catalog.refetch()}>Reintentar</Button>
        </>}
        <Banner tone="info" icon={info} title="Podés inscribirlo ahora">
          Le enviaremos una invitación para verificar su email y crear una contraseña. Su acceso queda pendiente.
        </Banner>
      </>}
    </ScrollView>
    <View className="gap-2 px-4 pb-6">
      {!blocked && <Button className="h-12" disabled={busy || (!existing && !catalog.data)}
        loading={busy} loadingLabel="Creando jugador…" onPress={submit}>{existing ? 'Seleccionar jugador' : 'Crear jugador'}</Button>}
      <Button variant="secondary" className="h-12 border-transparent bg-[#e7e7e8]" disabled={busy} onPress={close}>Cancelar</Button>
    </View>
  </>
}
