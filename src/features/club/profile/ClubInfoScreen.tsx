import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Redirect, router, usePreventRemove, type Href } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as ImagePicker from 'expo-image-picker'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { StartupReady } from '@/features/startup/StartupReady'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { apiClient } from '@/lib/api-client'
import { useClubProfile } from './use-club-profile'

const HOME = '/club/settings'
const field = { borderWidth: 1, borderColor: '#929195', borderRadius: 8, paddingHorizontal: 16, minHeight: 56, backgroundColor: '#fefefe', color: '#120f18' } as const

function useClubAccess() {
  const { user, destination, phase } = useAuth()
  const context = destination?.kind === 'club' ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  return { phase, destination, allowed: phase === 'ready' && Boolean(context?.permissions?.includes('MANAGE_CLUB_SETTINGS')), clubId: context?.clubId ?? null }
}

export function ClubInfoScreen() {
  const access = useClubAccess()
  const insets = useSafeAreaInsets()
  const profile = useClubProfile(access.allowed ? access.clubId : null)
  const [menu, setMenu] = useState<'logo' | 'cover' | null>(null)
  const [confirm, setConfirm] = useState<'discard' | 'deactivate' | 'reactivate' | 'blocked' | null>(null)
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([])
  const [localities, setLocalities] = useState<{ id: string; name: string }[]>([])
  const [catalogError, setCatalogError] = useState(false)
  const busy = profile.saving || !!profile.uploading || profile.statusBusy
  usePreventRemove(profile.dirty || busy, ({ data }) => {
    if (busy) return
    setConfirm('discard')
  })

  const loadCatalog = useCallback(async (provinceId?: string | null) => {
    setCatalogError(false)
    try {
      const prov = await apiClient.get<{ items: { id: string; name: string }[] }>('/locations/provinces?countryCode=AR', { timeoutMs: 15000 })
      setProvinces(prov.items ?? [])
      if (provinceId) {
        const loc = await apiClient.get<{ items: { id: string; name: string }[] }>(
          `/locations/localities?countryCode=AR&provinceId=${encodeURIComponent(provinceId)}`, { timeoutMs: 20000 })
        setLocalities(loc.items ?? [])
      } else setLocalities([])
    } catch {
      setCatalogError(true)
    }
  }, [])

  useEffect(() => { if (access.allowed) void loadCatalog(profile.draft?.provinceId) }, [access.allowed, profile.draft?.provinceId, loadCatalog])

  const pick = async (kind: 'logo' | 'cover') => {
    setMenu(null)
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    const type = asset.mimeType ?? 'image/jpeg'
    await profile.upload(kind, {
      uri: asset.uri,
      name: asset.fileName ?? `${kind}.jpg`,
      type,
      size: asset.fileSize,
    })
  }

  if (access.phase === 'checking') return <View style={s.center}><ActivityIndicator /></View>
  if (access.phase === 'unverified') return <SessionUnverified />
  if (access.phase !== 'ready') return <Redirect href="/login" />
  if (access.destination?.kind !== 'club') return <Redirect href="/events" />

  const draft = profile.draft

  return (
    <StartupReady>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#100e16' }}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
          <View style={s.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver a Mi Club" disabled={busy} onPress={() => {
              if (profile.dirty) { setConfirm('discard'); return }
              router.replace(HOME as Href)
            }} style={s.iconBtn}><Text style={{ color: '#fff', fontSize: 22 }}>←</Text></Pressable>
            <Text style={s.title}>Información del club</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 20 }}>
            {!access.allowed ? <Text>No tenés permiso para gestionar la configuración de este club.</Text>
              : profile.loading ? <Text>Cargando información del club…</Text>
                : profile.loadError ? <View style={{ gap: 12 }}><Text>No pudimos cargar la información.</Text><Button onPress={() => void profile.reload()}>Reintentar</Button></View>
                  : draft && <>
                    {profile.result && <Text style={{ color: profile.result === 'error' ? '#aa3030' : '#078332' }}>{profile.result === 'success' ? 'Cambios guardados' : 'No pudimos guardar los cambios'}</Text>}
                    <View style={{ aspectRatio: 370 / 184, backgroundColor: '#e7e7e8', borderRadius: 12, overflow: 'hidden' }}>
                      {draft.coverPhotoUrl && !draft.clearCover ? <Image source={{ uri: draft.coverPhotoUrl }} style={{ width: '100%', height: '100%' }} /> : <View style={s.center}><Text>Sin portada</Text></View>}
                      <Pressable style={s.editFab} onPress={() => setMenu('cover')} disabled={busy} accessibilityLabel="Editar portada"><Text style={{ color: '#fff' }}>✎</Text></Pressable>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end', marginTop: -40 }}>
                      <View style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: '#100e16', overflow: 'hidden', borderWidth: 4, borderColor: '#f7f7f7' }}>
                        {draft.logoUrl && !draft.clearLogo ? <Image source={{ uri: draft.logoUrl }} style={{ width: '100%', height: '100%' }} /> : null}
                        <Pressable style={[s.editFab, { right: -4, bottom: -4 }]} onPress={() => setMenu('logo')} disabled={busy} accessibilityLabel="Editar logo"><Text style={{ color: '#fff' }}>✎</Text></Pressable>
                      </View>
                      <View style={{ paddingBottom: 4 }}>
                        <Text style={{ fontSize: 18, fontWeight: '600' }}>{draft.name || 'Club'}</Text>
                        <Pressable onPress={() => router.push('/club/settings/info/preview' as Href)}><Text style={{ color: '#5b6b00', textDecorationLine: 'underline' }}>Ver perfil público</Text></Pressable>
                      </View>
                    </View>
                    {(profile.fieldErrors.logo || profile.fieldErrors.cover) && <Text style={{ color: '#aa3030' }}>{profile.fieldErrors.logo || profile.fieldErrors.cover}</Text>}

                    <Field label="Nombre del club *" error={profile.fieldErrors.name}>
                      <TextInput value={draft.name} editable={!busy} onChangeText={name => profile.patch({ name })} style={field} />
                    </Field>
                    <Field label="Descripción" error={profile.fieldErrors.description}>
                      <TextInput value={draft.description} editable={!busy} multiline onChangeText={description => profile.patch({ description })} style={[field, { minHeight: 128, textAlignVertical: 'top', paddingVertical: 12 }]} />
                      <Text style={s.help}>{draft.description.length} / 1000</Text>
                    </Field>
                    <Text style={s.section}>Contacto</Text>
                    <Field label="Email de contacto *" error={profile.fieldErrors.contactEmail}>
                      <TextInput value={draft.contactEmail} editable={!busy} autoCapitalize="none" keyboardType="email-address" onChangeText={contactEmail => profile.patch({ contactEmail })} style={field} />
                    </Field>
                    <Field label="Teléfono">
                      <TextInput value={draft.contactPhone} editable={!busy} onChangeText={contactPhone => profile.patch({ contactPhone })} style={field} />
                    </Field>

                    <Text style={s.section}>Ubicación del club</Text>
                    {profile.saved?.legacyLocation && !draft.provinceId && (
                      <Text style={{ backgroundColor: '#fff8e1', padding: 12, borderRadius: 8 }}>
                        Conservamos la ubicación anterior sin asociar: {[profile.saved.legacyLocation.city, profile.saved.legacyLocation.countryDivision].filter(Boolean).join(', ')}
                      </Text>
                    )}
                    <Field label="País"><TextInput value="Argentina" editable={false} style={[field, { backgroundColor: '#f7f7f7', color: '#605e64' }]} /></Field>
                    {catalogError && <Pressable onPress={() => void loadCatalog(draft.provinceId)}><Text style={{ color: '#aa3030' }}>Error de catálogo. Reintentar</Text></Pressable>}
                    <Field label="Provincia / jurisdicción *" error={profile.fieldErrors.province}>
                      <ScrollView horizontal style={{ maxHeight: 48 }}>{provinces.map(p => (
                        <Pressable key={p.id} onPress={() => { profile.patch({ provinceId: p.id, provinceName: p.name, localityId: null, localityName: null, locationDirty: true }); void loadCatalog(p.id) }}
                          style={{ paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderRadius: 8, backgroundColor: draft.provinceId === p.id ? '#c9cf38' : '#e7e7e8' }}>
                          <Text>{p.name}</Text>
                        </Pressable>
                      ))}</ScrollView>
                    </Field>
                    <Field label="Localidad *" error={profile.fieldErrors.locality}>
                      <ScrollView horizontal style={{ maxHeight: 48 }}>{localities.map(l => (
                        <Pressable key={l.id} disabled={!draft.provinceId} onPress={() => profile.patch({ localityId: l.id, localityName: l.name, locationDirty: true })}
                          style={{ paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderRadius: 8, backgroundColor: draft.localityId === l.id ? '#c9cf38' : '#e7e7e8' }}>
                          <Text>{l.name}</Text>
                        </Pressable>
                      ))}</ScrollView>
                    </Field>

                    <Text style={s.section}>Redes sociales</Text>
                    <Field label="Instagram" error={profile.fieldErrors.instagramUrl}>
                      <TextInput value={draft.instagramUrl} editable={!busy} autoCapitalize="none" onChangeText={instagramUrl => profile.patch({ instagramUrl })} style={field} placeholder="https://" />
                    </Field>
                    <Field label="Facebook" error={profile.fieldErrors.facebookUrl}>
                      <TextInput value={draft.facebookUrl} editable={!busy} autoCapitalize="none" onChangeText={facebookUrl => profile.patch({ facebookUrl })} style={field} placeholder="https://" />
                    </Field>

                    <Text style={s.section}>Estado del club</Text>
                    <Text style={s.help}>{profile.saved?.status === 'INACTIVE' ? 'Club inactivo.' : 'El club está activo.'}</Text>
                    {profile.saved?.status === 'ACTIVE'
                      ? <Button variant="secondary" disabled={busy} onPress={() => setConfirm('deactivate')}>Desactivar club</Button>
                      : <Button disabled={busy} onPress={() => setConfirm('reactivate')}>Reactivar club</Button>}
                  </>}
          </ScrollView>
          {access.allowed && !profile.loading && (
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e7e7e8' }}>
              <Text style={[s.help, { textAlign: 'center', marginBottom: 8 }]}>{profile.dirty ? 'Tenés cambios sin guardar' : 'Sin cambios pendientes'}</Text>
              <Button loading={profile.saving} loadingLabel="Guardando…" disabled={!profile.dirty || !!profile.uploading} onPress={() => void profile.save()}>Guardar cambios</Button>
            </View>
          )}
          <ClubBottomNav onDashboard={() => router.replace('/dashboard')} onClub={() => router.replace(HOME as Href)} busy={busy} bottomInset={insets.bottom} />
        </View>

        <Modal transparent visible={menu != null} animationType="fade" onRequestClose={() => setMenu(null)}>
          <Pressable style={s.modalBg} onPress={() => setMenu(null)}>
            <View style={s.sheet}>
              {menu && !(menu === 'logo' ? draft?.logoUrl && !draft.clearLogo : draft?.coverPhotoUrl && !draft.clearCover)
                ? <Pressable onPress={() => void pick(menu!)}><Text style={s.sheetItem}>Agregar</Text></Pressable>
                : <>
                  <Pressable onPress={() => void pick(menu!)}><Text style={s.sheetItem}>Cambiar</Text></Pressable>
                  <Pressable onPress={() => {
                    if (menu === 'logo') profile.patch({ clearLogo: true, logoUrl: null, logoKey: null })
                    else profile.patch({ clearCover: true, coverPhotoUrl: null, coverKey: null })
                    setMenu(null)
                  }}><Text style={[s.sheetItem, { color: '#d93e3e' }]}>Quitar</Text></Pressable>
                </>}
              <Pressable onPress={() => setMenu(null)}><Text style={[s.sheetItem, { color: '#605e64' }]}>Cancelar</Text></Pressable>
            </View>
          </Pressable>
        </Modal>

        <Modal transparent visible={confirm != null} animationType="fade" onRequestClose={() => { if (!profile.statusBusy) setConfirm(null) }}>
          <View style={s.modalBg}><View style={s.dialog}>
            {confirm === 'discard' && <>
              <Text style={s.dialogTitle}>¿Descartar los cambios?</Text>
              <Button variant="secondary" onPress={() => setConfirm(null)}>Seguir editando</Button>
              <Button onPress={() => { profile.discard(); setConfirm(null); router.replace(HOME as Href) }}>Descartar cambios</Button>
            </>}
            {confirm === 'deactivate' && <>
              <Text style={s.dialogTitle}>¿Desactivar el club?</Text>
              {profile.actionError === 'CLUB_HAS_ACTIVE_EVENTS' && <Text style={{ color: '#aa3030' }}>Hay eventos activos. Resolvelos antes.</Text>}
              <Button variant="secondary" disabled={profile.statusBusy} onPress={() => setConfirm(null)}>Cancelar</Button>
              <Button loading={profile.statusBusy} loadingLabel="Desactivando…" onPress={async () => {
                const ok = await profile.deactivate()
                if (ok) setConfirm(null)
                else if (profile.actionError === 'CLUB_HAS_ACTIVE_EVENTS') setConfirm('blocked')
              }}>Desactivar club</Button>
            </>}
            {confirm === 'blocked' && <>
              <Text style={s.dialogTitle}>No se puede desactivar</Text>
              <Text>Hay eventos en borrador, publicados o en inscripción/juego.</Text>
              <Button onPress={() => setConfirm(null)}>Entendido</Button>
            </>}
            {confirm === 'reactivate' && <>
              <Text style={s.dialogTitle}>¿Reactivar el club?</Text>
              <Button variant="secondary" disabled={profile.statusBusy} onPress={() => setConfirm(null)}>Cancelar</Button>
              <Button loading={profile.statusBusy} loadingLabel="Reactivando…" onPress={async () => { if (await profile.reactivate()) setConfirm(null) }}>Reactivar club</Button>
            </>}
          </View></View>
        </Modal>
      </SafeAreaView>
    </StartupReady>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <View style={{ gap: 8 }}><Text style={{ fontWeight: '500' }}>{label}</Text>{children}{error ? <Text style={{ color: '#aa3030' }}>{error}</Text> : null}</View>
}

const s = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#100e16' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  editFab: { position: 'absolute', right: 12, bottom: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: '#100e16', alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  help: { fontSize: 12, color: '#605e64' },
  modalBg: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 4 },
  sheetItem: { paddingVertical: 14, fontSize: 16 },
  dialog: { margin: 24, backgroundColor: '#fff', borderRadius: 16, padding: 24, gap: 12 },
  dialogTitle: { fontSize: 18, fontWeight: '600' },
})
