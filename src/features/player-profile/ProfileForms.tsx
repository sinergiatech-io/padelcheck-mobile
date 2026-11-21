import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { Eye, EyeOff } from 'lucide-react-native'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { ApiError, apiClient } from '@/lib/api-client'
import { RegistrationLocationFields } from '@/features/auth/RegistrationLocationFields'
import { useRegistrationLocation } from '@/features/auth/use-registration-location'
import { currentSessionGeneration } from '@/features/auth/session-generation'
import { ProfileAvatar, ProfileError, ProfileHeader, ProfileSkeleton } from './ProfileScreen'
import { hideProfileOn, profileKey, profileRequest, usePlayerProfile } from './profile-api'
import type { OwnProfile } from './profile-api'

const noGps = {
  permission: async () => 'unavailable' as const,
  position: async () => { throw new Error('Location is selected from the catalog') },
}
const field = 'h-14 rounded-lg border border-[#929195] bg-[#FEFEFE] px-4 font-inter-500 text-sm text-[#120F18]'
const copy = 'font-sans text-sm leading-5 text-[#605e64]'
const labelStyle = 'font-inter-500 text-sm leading-5 text-[#120F18]'

function Surface({ title, back, children }: { title: string; back: () => void; children: React.ReactNode }) {
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-[#FEFEFE]">
    <ProfileHeader title={title} back={back} />
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {children}
    </KeyboardAvoidingView>
  </SafeAreaView>
}

function ProfileEditor({ profile }: { profile: OwnProfile }) {
  const cache = useQueryClient()
  const { user } = useAuth()
  const flight = useRef(false)
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState(false)
  const [notice, setNotice] = useState('')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset>()
  const { model, state } = useRegistrationLocation(noGps, true)
  const initialLocation = useRef(profile.location)
  useEffect(() => { if (initialLocation.current) void model.preset(initialLocation.current) }, [model])
  const locationChanged = state.province?.id !== (profile.location?.provinceId ?? undefined)
    || state.selection?.localityId !== (profile.location?.localityId ?? undefined)
  const legacy = !profile.location ? [profile.city, profile.country].filter(Boolean).join(', ') : null

  async function pickPhoto() {
    if (flight.current) return
    flight.current = true
    setPicking(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, base64: true })
      const selected = result.assets?.[0]
      if (!selected) return
      if ((selected.fileSize ?? 0) > 5 * 1024 * 1024 || (selected.mimeType && !['image/jpeg', 'image/png'].includes(selected.mimeType))) {
        setNotice('Elegí un archivo JPG o PNG de hasta 5 MB.')
        return
      }
      if (!selected.base64) {
        setNotice('No pudimos leer la foto. Elegí otra o reintentá.')
        return
      }
      setNotice('')
      setPhoto(selected)
    } catch {
      setNotice('No pudimos abrir tus fotos. Reintentá.')
    } finally {
      flight.current = false
      setPicking(false)
    }
  }

  async function save() {
    if (flight.current || (locationChanged && !model.validate())) return
    flight.current = true
    setSaving(true)
    setNotice('')
    const key = profileKey(user?.userId)
    const generation = currentSessionGeneration()
    try {
      const request = {
        phone: phone.trim(),
        location: locationChanged ? model.request() : undefined,
        avatarBase64: photo?.base64 ?? undefined,
      }
      await cache.cancelQueries({ queryKey: key, exact: true })
      const updated = await apiClient.patch<OwnProfile>('/players/me', request, profileRequest)
      if (generation !== currentSessionGeneration()) return
      cache.setQueryData(key, { ...updated, recentTournaments: profile.recentTournaments, stats: profile.stats })
      router.dismissTo({ pathname: '/settings', params: { saved: '1' } })
    } catch (error) {
      if (photo && error instanceof ApiError && (error.code === 'PLAYER_AVATAR_INVALID' || error.status === 413)) {
        setPhoto(undefined)
        setNotice('No pudimos guardar la foto. Elegí un archivo JPG o PNG de hasta 5 MB y reintentá.')
      } else {
        setNotice('No pudimos guardar los cambios. Reintentá.')
      }
    } finally {
      flight.current = false
      setSaving(false)
    }
  }

  return <>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 24, gap: 12 }}>
      <View className="mb-2 flex-row items-center gap-4">
        <ProfileAvatar profile={profile} preview={photo?.uri} size={72} />
        <View className="flex-1 gap-1">
          <Text className="font-sans text-xs text-[#605e64]">Foto de perfil</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ busy: picking }} disabled={saving || picking} onPress={() => { void pickPhoto() }}>
            <Text className="font-inter-600 text-sm">{picking ? 'Cargando foto…' : 'Cambiar foto'}</Text>
          </Pressable>
          {photo && <Text accessibilityLiveRegion="polite" className="font-sans text-xs text-[#605e64]">Foto seleccionada</Text>}
          <Text className="font-sans text-xs text-[#605e64]">JPG o PNG · máx. 5 MB</Text>
        </View>
      </View>
      <View className="gap-2">
        <Text className={labelStyle}>Teléfono</Text>
        <TextInput className={field} accessibilityLabel="Teléfono" maxLength={32} autoComplete="tel"
          keyboardType="phone-pad" editable={!saving} value={phone} onChangeText={setPhone} />
      </View>
      <Text accessibilityRole="header" className="font-inter-600 text-xl">Ubicación</Text>
      <RegistrationLocationFields model={model} state={state} disabled={saving} wizard legacy={legacy} />
      <View className="gap-2">
        <Text className={labelStyle}>Email (solo lectura)</Text>
        <TextInput className={field + ' bg-[#f7f7f7] text-[#605e64]'} value={profile.email}
          accessibilityLabel="Email (solo lectura)" editable={false} />
      </View>
      <Text className={copy}>El email, el género y la categoría global se muestran en el perfil en modo de solo lectura.</Text>
      {notice && <Text accessibilityLiveRegion="polite" className="rounded-lg bg-red-50 p-3 font-sans text-sm text-red-800">{notice}</Text>}
    </ScrollView>
    <View className="px-4 pb-4 pt-2">
      <Button className="h-12 rounded-lg" disabled={picking} loading={saving} loadingLabel="Guardando cambios" onPress={() => { void save() }}>Guardar cambios</Button>
    </View>
  </>
}

export function EditProfileScreen() {
  const query = usePlayerProfile()
  const data = !hideProfileOn(query.error) && query.data && 'email' in query.data ? query.data as OwnProfile : null
  return <Surface title="Editar perfil" back={() => router.dismissTo('/settings')}>
    {query.isPending && <View className="p-4"><ProfileSkeleton /></View>}
    {query.isError && <View className="p-4"><ProfileError onRetry={() => { void query.refetch() }} /></View>}
    {data && <ProfileEditor key={data.playerId} profile={data} />}
  </Surface>
}

type Values = { currentPassword: string; password: string; confirmPassword: string }
type Session = { accessToken: string; expiresIn: number }
function PasswordFields() {
  const { login, logout, user } = useAuth()
  const flight = useRef(false)
  const [values, setValues] = useState<Values>({ currentPassword: '', password: '', confirmPassword: '' })
  const [visible, setVisible] = useState<Partial<Record<keyof Values, boolean>>>({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  async function save() {
    if (!user || flight.current) return
    if (!values.currentPassword || values.password.trim().length < 8) {
      setNotice('Ingresá tu contraseña actual y una nueva de al menos 8 caracteres.')
      return
    }
    if (values.password !== values.confirmPassword) { setNotice('Las contraseñas no coinciden.'); return }
    flight.current = true
    const generation = currentSessionGeneration()
    setBusy(true)
    setNotice('')
    try {
      const session = await apiClient.post<Session>('/auth/me/password', values, profileRequest)
      if (generation !== currentSessionGeneration()) return
      if (await login(session.accessToken, user, session.expiresIn)) {
        router.dismissTo({ pathname: '/profile-settings/security', params: { saved: '1' } })
      } else {
        await logout()
        router.replace('/login')
      }
    } catch (error) {
      setNotice(error instanceof ApiError && error.code === 'PASSWORD_CHANGE_INCORRECT_CURRENT'
        ? 'La contraseña actual es incorrecta.'
        : error instanceof ApiError && error.status === 429 ? 'Esperá un momento y reintentá.'
          : 'No pudimos cambiar la contraseña. Reintentá.')
    } finally {
      flight.current = false
      setBusy(false)
    }
  }
  const labels: Record<keyof Values, string> = {
    currentPassword: 'Contraseña actual', password: 'Nueva contraseña', confirmPassword: 'Confirmar nueva contraseña',
  }
  return <>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 12 }}>
      {(Object.keys(labels) as (keyof Values)[]).map(key => <View key={key} className="gap-2">
        <Text className={labelStyle}>{labels[key]} <Text className="text-red-600">*</Text></Text>
        <View className="relative">
          <TextInput className={field + ' pr-12'} accessibilityLabel={labels[key]}
            autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'}
            secureTextEntry={!visible[key]} autoCapitalize="none" maxLength={key === 'currentPassword' ? 1024 : 72}
            value={values[key]} editable={!busy} onChangeText={value => setValues({ ...values, [key]: value })} />
          <Pressable accessibilityRole="button" className="absolute right-2 top-2 h-10 w-10 items-center justify-center"
            accessibilityLabel={(visible[key] ? 'Ocultar ' : 'Mostrar ') + labels[key].toLowerCase()}
            onPress={() => setVisible({ ...visible, [key]: !visible[key] })}>
            {visible[key] ? <EyeOff size={18} color="#605e64" /> : <Eye size={18} color="#605e64" />}
          </Pressable>
        </View>
        {key === 'password' && <Text className={copy + ' text-right'}>Usá al menos 8 caracteres.</Text>}
      </View>)}
      {notice && <Text accessibilityLiveRegion="polite" className="rounded-lg bg-red-50 p-3 font-sans text-sm text-red-800">{notice}</Text>}
    </ScrollView>
    <View className="px-4 pb-4 pt-2">
      <Button className="h-12 rounded-lg" loading={busy} loadingLabel="Cambiando contraseña" onPress={() => { void save() }}>Cambiar contraseña</Button>
    </View>
  </>
}

export function SecurityScreen({ changing = false }: { changing?: boolean }) {
  const { saved } = useLocalSearchParams<{ saved?: string }>()
  const query = usePlayerProfile()
  const data = !hideProfileOn(query.error) && query.data && 'email' in query.data ? query.data as OwnProfile : null
  return <Surface title={changing ? 'Cambiar contraseña' : 'Seguridad'}
    back={() => router.dismissTo(changing ? '/profile-settings/security' : '/settings')}>
    {query.isPending && <View className="p-4"><ProfileSkeleton /></View>}
    {query.isError && <View className="p-4"><ProfileError onRetry={() => { void query.refetch() }} /></View>}
    {data && (changing && data.hasLocalPassword ? <PasswordFields /> : <View className="gap-3 p-4">
      {saved === '1' && <Text accessibilityLiveRegion="polite" className="rounded-lg bg-[#f8f9e9] p-3 font-sans text-sm">Contraseña actualizada</Text>}
      <Text accessibilityRole="header" className="font-inter-600 text-xl">Contraseña de PadelCheck</Text>
      <Text className={copy}>{data.hasLocalPassword ? 'Podés cambiar tu contraseña desde esta cuenta.' : 'Usás Google para ingresar. Podés crear una contraseña con un enlace enviado a tu email.'}</Text>
      <Button className="h-10 rounded-lg" onPress={() => router.push(data.hasLocalPassword ? '/profile-settings/password' : '/forgot-password')}>
        {data.hasLocalPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
      </Button>
    </View>)}
  </Surface>
}
