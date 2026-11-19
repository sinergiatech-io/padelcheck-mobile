import { Fragment } from 'react'
import { Text, TextInput, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SvgXml } from 'react-native-svg'
import { chevronXml } from './register-icons'
import { Banner } from './RegisterShell'
import { SearchPicker } from './SearchPicker'
import type { RegistrationLocation, LocationState } from './registration-location'

const fieldClass = 'h-[56px] rounded-[8px] border border-[#929195] bg-[#FEFEFE] px-[16px]'

function Retry({ label, onRetry }: { label: string; onRetry: () => void }) {
  return <View><Text className="font-sans text-sm text-[#AA3030]">{label}</Text><Button variant="ghost" onPress={onRetry}>Reintentar</Button></View>
}

type Props = {
  model: RegistrationLocation
  state: LocationState
  disabled: boolean
  /** Club onboarding wizard: placeholders from the KAN-129 decision plus catalog banners. The player form keeps its own copy. */
  wizard?: boolean
  /** Saved text-only location that could not be matched to the catalog (wizard only). */
  legacy?: string | null
}

export function RegistrationLocationFields({ model, state, disabled, wizard = false, legacy = null }: Props) {
  const provincePlaceholder = wizard ? 'Seleccioná provincia' : 'Seleccioná una provincia'
  const localityIdle = wizard ? (state.province ? 'Seleccioná localidad' : 'Elegí primero provincia') : 'Seleccioná una localidad'
  const provinceOptions = state.province && !state.provinces.some(item => item.id === state.province?.id) ? [state.province, ...state.provinces] : state.provinces
  const localityOptions = state.selection && state.selection.provinceId === state.province?.id && !state.localities.some(item => item.id === state.selection?.localityId)
    ? [{ id: state.selection.localityId, name: state.selection.localityName, provinceId: state.selection.provinceId }, ...state.localities]
    : state.localities
  const provinceDisabled = disabled || !state.province && state.provinceStatus !== 'ready'
  const localityDisabled = disabled || !state.province || ((state.localityStatus === 'loading' || state.localityStatus === 'error') && !state.selection)
  const provinceLabel = state.province?.name ?? (state.provinceStatus === 'loading' ? 'Cargando provincias…' : provincePlaceholder)
  const localityLabel = state.selection?.localityName ?? (!state.province || state.localityStatus !== 'loading' ? localityIdle : 'Cargando localidades…')
  return <Fragment>
    {wizard && legacy && !state.selection ? <Banner tone="warning" title="Ubicación anterior sin asociar" detail={`Teníamos guardado: ${legacy}. Elegí provincia y localidad del catálogo.`} /> : null}
    {wizard && (state.provinceStatus === 'error' || state.localityStatus === 'error') ? (
      <View className="gap-[8px]">
        <Banner title={state.provinceStatus === 'error' ? 'No pudimos cargar provincias' : 'No pudimos cargar localidades'} detail="Revisá tu conexión. Tus datos se conservaron." />
        <Button variant="ghost" disabled={disabled} onPress={() => {
          if (state.provinceStatus === 'error') void model.loadProvinces()
          if (state.localityStatus === 'error') void model.loadLocalities()
        }}>Reintentar carga</Button>
      </View>
    ) : null}
    <View className="gap-[8px]">
      <Text className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">País</Text>
      <TextInput accessibilityLabel="País, Argentina" value="Argentina" editable={false} style={wizard ? { backgroundColor: '#F7F7F7' } : undefined} className={`${fieldClass} border-[#B6B5B7] bg-[#F7F7F7] font-inter-500 text-[14px] text-[#605E64]`} />
    </View>
    <View className="gap-[8px]">
      <Text className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">Provincia<Text className="text-[#EF4444]">*</Text></Text>
      {wizard ? <SearchPicker title="Provincia" placeholder={state.provinceStatus === 'loading' ? 'Cargando provincias…' : provincePlaceholder} searchPlaceholder="Buscar provincia" options={provinceOptions}
        value={state.province?.id} valueLabel={state.province?.name} disabled={provinceDisabled} invalid={!!state.errors.province}
        accessibilityLabel={`Provincia, obligatorio, ${provinceLabel}${state.errors.province ? ', ' + state.errors.province : ''}`}
        onSelect={id => { const province = provinceOptions.find(item => item.id === id); if (province) void model.selectProvince(province) }} /> : <Select value={state.province?.id} onValueChange={id => { const province = provinceOptions.find(item => item.id === id); if (province) void model.selectProvince(province) }}>
        <SelectTrigger disabled={provinceDisabled} accessibilityRole="button" accessibilityLabel={`Provincia, obligatorio, ${provinceLabel}${state.errors.province ? ', ' + state.errors.province : ''}`} accessibilityState={{ disabled: provinceDisabled }} className={`${fieldClass} disabled:opacity-100 ${state.errors.province ? 'border-[#EF4444]' : ''}`} indicator={<SvgXml xml={chevronXml} />}>
          <SelectValue className={`font-inter-500 text-[14px] leading-[20px] ${state.province ? 'text-[#120F18]' : 'text-[#605E64]'}`} placeholder={state.provinceStatus === 'loading' ? 'Cargando provincias…' : provincePlaceholder} />
        </SelectTrigger>
        <SelectContent>{provinceOptions.map(option => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent>
      </Select>}
      {state.errors.province && <Text accessibilityRole="alert" className="text-right font-inter-500 text-[14px] leading-[20px] text-[#AA3030]">{state.errors.province}</Text>}
      {!wizard && state.provinceStatus === 'error' && <Retry label="No pudimos cargar las provincias." onRetry={() => { void model.loadProvinces() }} />}
    </View>
    <View className="gap-[8px]">
      <Text className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">Localidad<Text className="text-[#EF4444]">*</Text></Text>
      {wizard ? <SearchPicker title="Localidad" placeholder={state.province && state.localityStatus === 'loading' && !state.selection ? 'Cargando localidades…' : localityIdle} searchPlaceholder="Buscar localidad" options={localityOptions}
        value={state.selection?.localityId} valueLabel={state.selection?.localityName} disabled={localityDisabled} invalid={!!state.errors.locality}
        style={!state.province ? { backgroundColor: '#F7F7F7' } : undefined}
        accessibilityLabel={`Localidad, obligatorio, ${localityLabel}${state.errors.locality ? ', ' + state.errors.locality : ''}`}
        onSelect={id => { const locality = localityOptions.find(item => item.id === id); if (locality) model.selectLocality(locality) }} /> : <Select value={state.selection?.localityId} onValueChange={id => { const locality = localityOptions.find(item => item.id === id); if (locality) model.selectLocality(locality) }}>
        <SelectTrigger disabled={localityDisabled} accessibilityRole="button" accessibilityLabel={`Localidad, obligatorio, ${localityLabel}${state.errors.locality ? ', ' + state.errors.locality : ''}`} accessibilityState={{ disabled: localityDisabled }} style={wizard && !state.province ? { backgroundColor: '#F7F7F7' } : undefined} className={`${fieldClass} ${!state.province && !disabled ? 'disabled:opacity-100' : ''} ${state.errors.locality ? 'border-[#EF4444]' : ''}`} indicator={<SvgXml xml={chevronXml} />}>
          <SelectValue className={`font-inter-500 text-[14px] leading-[20px] ${state.selection ? 'text-[#120F18]' : 'text-[#605E64]'}`} placeholder={!state.province || state.localityStatus !== 'loading' || state.selection ? localityIdle : 'Cargando localidades…'} />
        </SelectTrigger>
        <SelectContent>{localityOptions.map(option => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent>
      </Select>}
      {state.errors.locality && <Text accessibilityRole="alert" className="text-right font-inter-500 text-[14px] leading-[20px] text-[#AA3030]">{state.errors.locality}</Text>}
      {wizard && state.province && state.changedFrom && !state.selection ? (
        <Text accessibilityLiveRegion="polite" className="font-sans text-[14px] leading-[20px] text-[#605E64]">
          Cambiaste la provincia. Elegí una localidad de {state.province.name}.
        </Text>
      ) : null}
      {!wizard && state.province && state.localityStatus === 'error' && <Retry label="No pudimos cargar las localidades." onRetry={() => { void model.loadLocalities() }} />}
    </View>
  </Fragment>
}
