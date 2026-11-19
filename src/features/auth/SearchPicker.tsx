import { useEffect, useMemo, useState } from 'react'
import { FlatList, Keyboard, Modal, Platform, Pressable, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { Banner } from './RegisterShell'
import { chevronXml } from './register-icons'

export interface PickerOption { id: string; name: string }
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/** Case and accent insensitive filter. Typing narrows the list; only tapping an option chooses it. */
export function filterOptions(options: PickerOption[], query: string): PickerOption[] {
  const needle = fold(query)
  return needle ? options.filter(option => fold(option.name).includes(needle)) : options
}

/** Searchable catalog selector (KAN-251 «buscar provincia/localidad»). The query is kept while the sheet is open. */
export function SearchPicker({ title, placeholder, searchPlaceholder, options, value, valueLabel, disabled, invalid, accessibilityLabel, style, onSelect }: {
  title: string
  placeholder: string
  searchPlaceholder: string
  options: PickerOption[]
  value?: string
  valueLabel?: string
  disabled?: boolean
  invalid?: boolean
  accessibilityLabel: string
  style?: StyleProp<ViewStyle>
  onSelect: (id: string) => void
}) {
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [keyboard, setKeyboard] = useState(0)
  const visible = useMemo(() => filterOptions(options, query), [options, query])
  useEffect(() => {
    if (!open) return
    const show = Keyboard.addListener('keyboardDidShow', event => setKeyboard(event.endCoordinates.height))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0))
    return () => { show.remove(); hide.remove(); setKeyboard(0) }
  }, [open])
  const close = () => { setOpen(false); setQuery('') }
  return <>
    <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled: !!disabled }} style={style}
      onPress={() => { Keyboard.dismiss(); setOpen(true) }}
      className={`h-[56px] flex-row items-center justify-between rounded-[8px] border bg-[#FEFEFE] px-[16px] ${invalid ? 'border-[#EF4444]' : 'border-[#929195]'}`}>
      <Text numberOfLines={1} className={`min-w-0 flex-1 font-inter-500 text-[14px] leading-[20px] ${valueLabel ? 'text-[#120F18]' : 'text-[#605E64]'}`}>{valueLabel ?? placeholder}</Text>
      <SvgXml xml={chevronXml} />
    </Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
      <View className="flex-1 justify-end bg-[#120F18]/50">
        <View className="rounded-t-[24px] bg-[#FEFEFE] px-[16px] pt-[16px]" style={{ height: '75%', paddingBottom: Platform.OS === 'android' ? Math.max(keyboard, insets.bottom) : keyboard || insets.bottom }}>
          <View className="flex-row items-center justify-between pb-[12px]">
            <Text accessibilityRole="header" className="font-inter-600 text-[18px] leading-[24px] text-[#120F18]">{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={close} className="h-[44px] w-[44px] items-center justify-center"><Text className="font-inter-500 text-[24px] text-[#605E64]">×</Text></Pressable>
          </View>
          <TextInput value={query} onChangeText={setQuery} placeholder={searchPlaceholder} placeholderTextColor="#605E64" autoCorrect={false} autoCapitalize="none" accessibilityLabel={searchPlaceholder}
            className="h-[48px] rounded-[8px] border border-[#929195] px-[16px] font-inter-500 text-[14px] text-[#120F18]" />
          <View className="min-h-0 flex-1 pt-[8px]">
            {visible.length === 0
              ? <View className="pt-[8px]"><Banner tone="info" title="Sin coincidencias" detail="Probá con otro nombre. Tu búsqueda se conserva." /></View>
              : <FlatList removeClippedSubviews={false} data={visible} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" initialNumToRender={20} renderItem={({ item }) => {
                const selected = item.id === value
                return <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={item.name} onPress={() => { onSelect(item.id); close() }}
                  className={`min-h-[48px] justify-center border-b border-[#E7E7E8] px-[8px] ${selected ? 'bg-[#EEF0C1]' : ''}`}>
                  <Text className={`text-[16px] leading-[24px] text-[#120F18] ${selected ? 'font-inter-600' : 'font-sans'}`}>{item.name}</Text>
                </Pressable>
              }} />}
          </View>
        </View>
      </View>
    </Modal>
  </>
}
