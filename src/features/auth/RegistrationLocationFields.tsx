import { useEffect, useRef, useState, type ElementRef } from 'react'
import { Text, TextInput, View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { LocationOnIcon } from '@/components/icons/TournamentCardIcons'
import { SearchFieldIcon } from '@/components/icons/SearchFieldIcon'
import { chevronXml, infoXml, successXml, errorXml } from './register-icons'
import { filterProvinces, type RegistrationLocation, type LocationState } from './registration-location'

const fieldClass = 'h-[56px] rounded-[8px] border border-[#929195] bg-[#FEFEFE] px-[16px]'
type Option = { id: string; name: string }
type SearchFocus = { onSearchFocus: (input: ElementRef<typeof TextInput> | null) => void; onSearchBlur: () => void }
function Combo({ label, value, placeholder, options, disabled, loading, error, query, onQuery, onSelect, nextPage, previousPage, onSearchFocus, onSearchBlur }: {
  label: string; value?: string; placeholder: string; options: Option[]; disabled: boolean; loading: boolean; error?: string
  query: string; onQuery: (query: string) => void; onSelect: (option: Option) => void; nextPage?: () => void; previousPage?: () => void
} & SearchFocus) {
  const [open, setOpen] = useState(false)
  const search = useRef<ElementRef<typeof TextInput>>(null)
  useEffect(() => { if (disabled) setOpen(false) }, [disabled])
  useEffect(() => { if (open) search.current?.focus() }, [open])
  return <View className="gap-[8px]">
    <Text className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">{label}<Text className="text-[#EF4444]">*</Text></Text>
    <Button variant="ghost" disabled={disabled} accessibilityLabel={`${label}, obligatorio, ${value ?? placeholder}${error ? ', ' + error : ''}`} accessibilityState={{ expanded: open, disabled }}
      onPress={() => setOpen(v => !v)} className={`${fieldClass} flex-row justify-between disabled:opacity-100 ${disabled ? 'border-[#B6B5B7] bg-[#F7F7F7]' : ''} ${error ? 'border-[#EF4444]' : ''}`}>
      <View className="w-full flex-row items-center justify-between gap-[8px]"><Text numberOfLines={1} className={`min-w-0 flex-1 font-inter-500 text-[14px] leading-[20px] ${value ? 'text-[#120F18]' : disabled ? 'text-[#929195]' : 'text-[#605E64]'}`}>{value ?? placeholder}</Text><SvgXml xml={chevronXml} width={24} height={24} /></View>
    </Button>
    {error && <Text accessibilityRole="alert" className="text-right font-inter-500 text-[14px] leading-[20px] text-[#AA3030]">{error}</Text>}
    {open && !disabled && <View className="gap-[4px] rounded-[8px] border border-[#E7E7E8] bg-[#FEFEFE] p-[4px]">
      <TextInput ref={search} maxLength={100} accessibilityLabel={`Buscar ${label.toLowerCase()}`} value={query} onChangeText={onQuery} placeholder="Buscar…" placeholderTextColor="#605E64" autoCorrect={false}
        onFocus={() => onSearchFocus(search.current)} onBlur={onSearchBlur} className="h-[48px] rounded-[8px] border border-[#929195] px-[12px] font-inter-500 text-[14px] text-[#120F18]" />
      {loading ? <Text accessibilityLiveRegion="polite" className="p-[12px] font-sans text-[14px] text-[#605E64]">Cargando…</Text> : options.map(option => <Button key={option.id} variant="ghost" accessibilityLabel={option.name} accessibilityState={{ selected: value === option.name }}
        onPress={() => { onSelect(option); setOpen(false) }} className={`min-h-[48px] items-start rounded-[4px] px-[12px] ${value === option.name ? 'bg-[#FAFAEB]' : ''}`}><Text className="font-inter-500 text-[14px] text-[#120F18]">{option.name}</Text></Button>)}
      {!loading && !options.length && <Text accessibilityLiveRegion="polite" className="p-[12px] font-sans text-[14px] text-[#605E64]">No encontramos opciones. Probá con otro nombre.</Text>}
      {(previousPage || nextPage) && <View className="flex-row justify-between"><Button variant="ghost" disabled={!previousPage || loading} onPress={previousPage}>Anterior</Button><Button variant="ghost" disabled={!nextPage || loading} onPress={nextPage}>Más localidades</Button></View>}
      <Button variant="ghost" onPress={() => setOpen(false)}>Cerrar opciones</Button>
    </View>}
  </View>
}
export function RegistrationLocationFields({ model, state, disabled, onSearchFocus, onSearchBlur }: { model: RegistrationLocation; state: LocationState; disabled: boolean } & SearchFocus) {
  const [provinceQuery, setProvinceQuery] = useState('')
  const [localQuery, setLocalQuery] = useState('')
  useEffect(() => { setLocalQuery('') }, [state.province?.id])
  const action = (label: string, run: () => void) => <Button variant="ghost" disabled={disabled} className="h-[44px] w-full" onPress={run}><Text className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">{label}</Text></Button>
  const banner = (tone: 'info' | 'success' | 'warning' | 'error', title: string, detail: string, icon: 'pin' | 'clock' | 'success' | 'error' | 'search') => <View accessibilityRole="alert" className={`flex-row items-center gap-[12px] rounded-[8px] border p-[12px] ${{ info: 'border-[#C2D8FC] bg-[#EBF3FE]', success: 'border-[#BAEDCD] bg-[#E9F9EF]', warning: 'border-[#FCE1B3] bg-[#FEF5E7]', error: 'border-[#FAC5C5] bg-[#FDECEC]' }[tone]}`}>
    <View className="h-[24px] w-[24px] items-center justify-center">{icon === 'pin' ? <LocationOnIcon size={20} color="#605E64" /> : icon === 'search' ? <SearchFieldIcon size={20} color="#605E64" /> : <SvgXml xml={{ clock: infoXml, success: successXml, error: errorXml }[icon]} />}</View>
    <View className="min-w-0 flex-1"><Text className="font-inter-600 text-[14px] leading-[20px] text-[#120F18]">{title}</Text><Text className="mt-[2px] font-sans text-[12px] leading-[16px] text-[#605E64]">{detail}</Text></View>
  </View>
  const focus = { onSearchFocus, onSearchBlur }
  return <View className="gap-[12px]">
    <Text accessibilityRole="header" className="font-inter-700 text-[16px] leading-[24px] text-[#120F18]">Tu ubicación</Text><Text className="font-sans text-[14px] leading-[20px] text-[#605E64]">Para mostrarte eventos cercanos.</Text>
    {state.mode === 'choice' && <>{banner('info', 'Encontrá eventos cerca', 'Usá tu ubicación o elegí una localidad de Argentina.', 'pin')}{action('Usar mi ubicación', () => { void model.detect() })}{action('Elegir localidad', () => { void model.manual() })}</>}
    {state.mode === 'detecting' && <>{banner('info', 'Buscando tu localidad…', 'Esperá un momento o elegila manualmente.', 'clock')}{action('Elegir localidad', () => { void model.manual() })}</>}
    {state.mode === 'resolved' && state.selection && <>{banner('success', 'Ubicación detectada', `${state.selection.localityName}, ${state.selection.provinceName}, Argentina`, 'success')}{action('Cambiar localidad', () => { void model.manual() })}</>}
    {state.mode === 'manual' && <>
      {state.problem && banner('warning', state.problem === 'denied' ? 'Elegí tu localidad' : state.problem === 'outside' ? 'Por ahora, solo Argentina' : 'No pudimos ubicarte', state.problem === 'denied' ? 'Podés registrarte sin compartir tu ubicación.' : state.problem === 'outside' ? 'Elegí una localidad argentina para continuar.' : 'Elegí tu localidad para continuar.', state.problem === 'outside' ? 'pin' : 'error')}
      <View className="gap-[8px]"><Text className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">País</Text><TextInput accessibilityLabel="País, Argentina" value="Argentina" editable={false} className={`${fieldClass} border-[#B6B5B7] bg-[#F7F7F7] font-inter-500 text-[14px] text-[#929195]`} /></View>
      <Combo {...focus} label="Provincia / Jurisdicción" value={state.province?.name} placeholder={state.provinceStatus === 'loading' ? 'Cargando provincias…' : 'Seleccioná una provincia'}
        options={filterProvinces(state.provinces, provinceQuery)} disabled={disabled || state.provinceStatus !== 'ready'} loading={false} error={state.errors.province}
        query={provinceQuery} onQuery={setProvinceQuery} onSelect={option => { void model.selectProvince(option); setProvinceQuery('') }} />
      <Combo {...focus} label="Ciudad / Localidad" value={state.selection?.localityName} placeholder={!state.province ? 'Primero elegí una provincia' : state.localityStatus === 'loading' ? 'Cargando localidades…' : 'Seleccioná una localidad'}
        options={state.localities} disabled={disabled || !state.province || state.localityStatus === 'error'} loading={state.localityStatus === 'loading'} error={state.errors.locality}
        query={localQuery} onQuery={query => { setLocalQuery(query); void model.searchLocalities(query) }}
        onSelect={option => { const locality = state.localities.find(l => l.id === option.id); if (locality) model.selectLocality(locality) }}
        previousPage={state.page > 0 ? () => { void model.searchLocalities(state.query, state.page - 1) } : undefined}
        nextPage={(state.page + 1) * 25 < state.total ? () => { void model.searchLocalities(state.query, state.page + 1) } : undefined} />
      {(state.provinceStatus === 'error' || state.localityStatus === 'error') && <>{banner('error', 'No pudimos cargar el catálogo', 'Conservamos tus datos. Intentá de nuevo.', 'error')}{action('Reintentar catálogo', () => { void (state.provinceStatus === 'error' ? model.loadProvinces() : model.searchLocalities(state.query)) })}</>}
      {!state.problem && action('Usar mi ubicación', () => { void model.detect() })}
    </>}
  </View>
}
