import { Fragment } from 'react'
import { Text, TextInput, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SvgXml } from 'react-native-svg'
import { chevronXml } from './register-icons'
import type { RegistrationLocation, LocationState } from './registration-location'

const fieldClass = 'h-[56px] rounded-[8px] border border-[#929195] bg-[#FEFEFE] px-[16px]'

function Retry({ label, onRetry }: { label: string; onRetry: () => void }) {
  return <View><Text className="font-sans text-sm text-[#AA3030]">{label}</Text><Button variant="ghost" onPress={onRetry}>Reintentar</Button></View>
}

export function RegistrationLocationFields({ model, state, disabled }: { model: RegistrationLocation; state: LocationState; disabled: boolean }) {
  const provinceOptions = state.province && !state.provinces.some(item => item.id === state.province?.id) ? [state.province, ...state.provinces] : state.provinces
  const localityOptions = state.selection && state.selection.provinceId === state.province?.id && !state.localities.some(item => item.id === state.selection?.localityId)
    ? [{ id: state.selection.localityId, name: state.selection.localityName, provinceId: state.selection.provinceId }, ...state.localities]
    : state.localities
  const provinceDisabled = disabled || !state.province && state.provinceStatus !== 'ready'
  const localityDisabled = disabled || !state.province || ((state.localityStatus === 'loading' || state.localityStatus === 'error') && !state.selection)
  const provinceLabel = state.province?.name ?? (state.provinceStatus === 'loading' ? 'Cargando provincias…' : 'Seleccioná una provincia')
  const localityLabel = state.selection?.localityName ?? (!state.province || state.localityStatus !== 'loading' ? 'Seleccioná una localidad' : 'Cargando localidades…')
  return <Fragment>
    <View className="gap-[8px]">
      <Text className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">País</Text>
      <TextInput accessibilityLabel="País, Argentina" value="Argentina" editable={false} className={`${fieldClass} border-[#B6B5B7] bg-[#F7F7F7] font-inter-500 text-[14px] text-[#605E64]`} />
    </View>
    <View className="gap-[8px]">
      <Text className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">Provincia<Text className="text-[#EF4444]">*</Text></Text>
      <Select value={state.province?.id} onValueChange={id => { const province = provinceOptions.find(item => item.id === id); if (province) void model.selectProvince(province) }}>
        <SelectTrigger disabled={provinceDisabled} accessibilityRole="button" accessibilityLabel={`Provincia, obligatorio, ${provinceLabel}${state.errors.province ? ', ' + state.errors.province : ''}`} accessibilityState={{ disabled: provinceDisabled }} className={`${fieldClass} disabled:opacity-100 ${state.errors.province ? 'border-[#EF4444]' : ''}`} indicator={<SvgXml xml={chevronXml} />}>
          <SelectValue className={`font-inter-500 text-[14px] leading-[20px] ${state.province ? 'text-[#120F18]' : 'text-[#605E64]'}`} placeholder={state.provinceStatus === 'loading' ? 'Cargando provincias…' : 'Seleccioná una provincia'} />
        </SelectTrigger>
        <SelectContent>{provinceOptions.map(option => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent>
      </Select>
      {state.errors.province && <Text accessibilityRole="alert" className="text-right font-inter-500 text-[14px] leading-[20px] text-[#AA3030]">{state.errors.province}</Text>}
      {state.provinceStatus === 'error' && <Retry label="No pudimos cargar las provincias." onRetry={() => { void model.loadProvinces() }} />}
    </View>
    <View className="gap-[8px]">
      <Text className="font-inter-500 text-[14px] leading-[20px] text-[#120F18]">Localidad<Text className="text-[#EF4444]">*</Text></Text>
      <Select value={state.selection?.localityId} onValueChange={id => { const locality = localityOptions.find(item => item.id === id); if (locality) model.selectLocality(locality) }}>
        <SelectTrigger disabled={localityDisabled} accessibilityRole="button" accessibilityLabel={`Localidad, obligatorio, ${localityLabel}${state.errors.locality ? ', ' + state.errors.locality : ''}`} accessibilityState={{ disabled: localityDisabled }} className={`${fieldClass} ${!state.province && !disabled ? 'disabled:opacity-100' : ''} ${state.errors.locality ? 'border-[#EF4444]' : ''}`} indicator={<SvgXml xml={chevronXml} />}>
          <SelectValue className={`font-inter-500 text-[14px] leading-[20px] ${state.selection ? 'text-[#120F18]' : 'text-[#605E64]'}`} placeholder={!state.province || state.localityStatus !== 'loading' || state.selection ? 'Seleccioná una localidad' : 'Cargando localidades…'} />
        </SelectTrigger>
        <SelectContent>{localityOptions.map(option => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent>
      </Select>
      {state.errors.locality && <Text accessibilityRole="alert" className="text-right font-inter-500 text-[14px] leading-[20px] text-[#AA3030]">{state.errors.locality}</Text>}
      {state.province && state.localityStatus === 'error' && <Retry label="No pudimos cargar las localidades." onRetry={() => { void model.loadLocalities() }} />}
    </View>
  </Fragment>
}
