import { X } from 'lucide-react-native'
import { SearchFieldIcon } from '@/components/icons/SearchFieldIcon'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Keyboard, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { PlayerPersonIcon } from '@/components/icons/PlayerPersonIcon'
import { cn } from '@/lib/utils'
import { eventsMockService } from '@/features/events/api/events.mock'
import { useEnrollmentModal } from '@/features/events/context/EnrollmentModalContext'
import { useEnrollmentForm } from '@/features/events/hooks/use-enrollment-form'
import { useEnrollmentModalKeyboard } from '@/features/events/hooks/use-enrollment-modal-keyboard'
import type { EnrollablePlayer } from '@/features/events/types'

type EnrollmentModalProps = {
  eventId: string
  categoryId: string
  onSuccess: () => void
}

function StepHeading({ step, label }: { step: number; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-6 w-6 items-center justify-center rounded-full bg-primary-500/10">
        <Text className="font-inter-700 text-caption text-primary-500">{step}</Text>
      </View>
      <Text className="font-inter-600 text-body-sm text-dark-900">{label}</Text>
    </View>
  )
}

function SelectedPlayerCard({
  player,
  clearable,
  onClear,
}: {
  player: EnrollablePlayer
  clearable: boolean
  onClear?: () => void
}) {
  return (
    <View className="flex-row items-center justify-between rounded-lg border border-[#b7bc33] bg-[#fafaeb] p-2">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-[#eef0c1]">
          <PlayerPersonIcon size={20} color="#C9CF38" />
        </View>
        <Text className="flex-1 font-inter-600 text-body-sm text-dark-900" numberOfLines={1}>
          {player.name}
        </Text>
      </View>
      {clearable ? (
        <Pressable
          accessibilityLabel="Quitar jugador"
          onPress={onClear}
          className="h-10 w-10 items-center justify-center rounded-lg"
        >
          <X size={24} color="#605E64" />
        </Pressable>
      ) : null}
    </View>
  )
}

function PlayerSearchSlot({
  step,
  label,
  player,
  readOnly,
  excludeIds,
  onSelect,
  onClear,
}: {
  step: number
  label: string
  player: EnrollablePlayer | null
  readOnly?: boolean
  excludeIds: string[]
  onSelect: (player: EnrollablePlayer) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<EnrollablePlayer[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (player) {
      setQuery('')
      setResults([])
      setDropdownOpen(false)
      return
    }
    if (!dropdownOpen) return
    const timer = setTimeout(() => {
      eventsMockService.searchEnrollmentPlayers(query, { excludeIds }).then(setResults)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, excludeIds, player, dropdownOpen])

  const showResults = dropdownOpen && !player && results.length > 0

  return (
    <View className="gap-4">
      <StepHeading step={step} label={label} />
      {player && readOnly ? (
        <SelectedPlayerCard player={player} clearable={false} />
      ) : player ? (
        <SelectedPlayerCard player={player} clearable onClear={onClear} />
      ) : (
        <View>
          <View className="h-14 flex-row items-center gap-2 rounded-lg border border-[#b7bc33] bg-[#fefefe] px-4 py-2">
            <SearchFieldIcon size={24} color="#929195" />
            <TextInput
              value={query}
              onChangeText={(text) => {
                setQuery(text)
                setDropdownOpen(true)
              }}
              onFocus={() => setDropdownOpen(true)}
              returnKeyType="search"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
              placeholder="Buscar jugador..."
              placeholderTextColor="#929195"
              className="min-h-6 flex-1 p-0 font-inter-400 text-body-sm text-dark-900"
              style={{ includeFontPadding: false, textAlignVertical: 'center' }}
            />
          </View>
          {showResults && results.length > 0 ? (
            <ScrollView
              className="mt-1 max-h-48 rounded-lg border border-[#e7e7e8] bg-surface"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {results.map((item) => (
                <Pressable
                  key={item.id}
                  className="flex-row items-center gap-3 px-3 py-2"
                  onPress={() => {
                    onSelect(item)
                    setQuery('')
                    setDropdownOpen(false)
                  }}
                >
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-500/10">
                    <PlayerPersonIcon size={16} color="#C9CF38" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-inter-600 text-body-sm text-dark-900" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="font-sans text-caption text-[#6b7280]" numberOfLines={1}>
                      {item.location}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      )}
    </View>
  )
}

export function EnrollmentModal({ eventId, categoryId, onSuccess }: EnrollmentModalProps) {
  const { isOpen, mode, registration, close } = useEnrollmentModal()
  const [currentPlayer, setCurrentPlayer] = useState<EnrollablePlayer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [modalHeight, setModalHeight] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    eventsMockService.getCurrentEnrollmentPlayer().then(setCurrentPlayer)
  }, [isOpen])

  const { player1, player2, setPlayer1, setPlayer2, canConfirm, player1ReadOnly } = useEnrollmentForm({
    mode,
    registration,
    currentPlayer,
    isOpen,
  })

  const title = mode === 'create' ? 'Nueva inscripción' : 'Editar inscripción'
  const excludeForSlot1 = player2 ? [player2.id] : []
  const excludeForSlot2 = player1 ? [player1.id] : []
  const isConfirmEnabled = canConfirm && !submitting
  const { keyboardOpen, overlayPaddingTop, maxModalHeight } = useEnrollmentModalKeyboard(isOpen, modalHeight)

  const onConfirm = async () => {
    if (!player1 || !player2 || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      if (mode === 'create') {
        await eventsMockService.enroll(eventId, categoryId, player1, player2)
      } else if (registration) {
        await eventsMockService.updateRegistration(eventId, categoryId, registration.id, player1, player2)
      }
      close()
      onSuccess()
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const modalContent = (
    <>
      <View className="h-14 flex-row items-center justify-between border-b border-[#e5e5e5] pl-4 pr-2">
        <Text className="font-inter-700 text-body-sm text-dark-900">{title}</Text>
        <Pressable
          accessibilityLabel="Cerrar"
          onPress={close}
          className="h-9 w-9 items-center justify-center rounded-xl"
        >
          <X size={20} color="#120F18" />
        </Pressable>
      </View>

      <View className="gap-6 px-6 py-6">
        <PlayerSearchSlot
          step={1}
          label="Jugador 1"
          player={player1}
          readOnly={player1ReadOnly}
          excludeIds={excludeForSlot1}
          onSelect={setPlayer1}
          onClear={() => setPlayer1(null)}
        />
        <PlayerSearchSlot
          step={2}
          label="Jugador 2"
          player={player2}
          excludeIds={excludeForSlot2}
          onSelect={setPlayer2}
          onClear={() => setPlayer2(null)}
        />

        <View className="flex-row gap-3 border-t border-[#e5e5e5] pt-4">
          <Pressable onPress={close} className="h-10 flex-1 items-center justify-center rounded-lg bg-[#e7e7e8]">
            <Text className="font-sans text-body-sm font-medium text-[#605e64]">Cancelar</Text>
          </Pressable>
          <Button
            disabled={!isConfirmEnabled}
            loading={submitting}
            loadingLabel="Confirmando inscripción…"
            onPress={() => void onConfirm()}
            className={cn(
              'h-10 flex-1 items-center justify-center rounded-lg px-0 disabled:opacity-100',
              isConfirmEnabled ? 'bg-primary-500' : 'bg-[#eef0c1] opacity-50',
            )}
          >
            <Text
              className={cn(
                'font-sans text-body-sm font-medium',
                isConfirmEnabled ? 'text-dark-900' : 'text-[#605e64]',
              )}
            >
              Confirmar
            </Text>
          </Button>
        </View>
      </View>
    </>
  )

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        className="flex-1 bg-black/40 px-4"
        style={{ justifyContent: 'flex-start', paddingTop: overlayPaddingTop }}
        onPress={close}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          onLayout={(event) => setModalHeight(event.nativeEvent.layout.height)}
          className="overflow-hidden rounded-2xl bg-surface"
          style={maxModalHeight ? { maxHeight: maxModalHeight } : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={keyboardOpen}
            scrollEnabled={keyboardOpen}
            bounces={keyboardOpen}
          >
            {modalContent}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
