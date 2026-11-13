import { useRef, useState } from 'react'
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Redirect, router, usePreventRemove, type Href } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { SvgXml } from 'react-native-svg'
import * as ImagePicker from 'expo-image-picker'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { StartupReady } from '@/features/startup/StartupReady'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { framedTransform, framing, type ImageFraming } from './club-profile-model'
import { ClubGeoFields } from './ClubGeoFields'
import { useClubProfile } from './use-club-profile'

const HOME = '/club/settings'
const field = { borderWidth: 1, borderColor: '#929195', borderRadius: 8, paddingHorizontal: 16, minHeight: 56, backgroundColor: '#fefefe', color: '#120f18' } as const
const EDIT_XML = '<svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><path fill="#605E64" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>'

function useClubAccess() {
  const { user, destination, phase } = useAuth()
  const context = destination?.kind === 'club' ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  return { phase, destination, allowed: phase === 'ready' && Boolean(context?.permissions?.includes('MANAGE_CLUB_SETTINGS')), clubId: context?.clubId ?? null }
}

function FramedImage({ uri, framingValue, mode, style }: {
  uri: string
  framingValue: ImageFraming
  mode: 'contain' | 'cover'
  style: object
}) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  return (
    <View style={[style, { overflow: 'hidden' }]} onLayout={e => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {size.width > 0 && (
        <Image
          source={{ uri }}
          resizeMode={mode}
          style={{
            width: size.width,
            height: size.height,
            transform: [...framedTransform(framingValue, size.width, size.height)],
          }}
        />
      )}
    </View>
  )
}

function FramingEditor({ title, src, initial, aspect, onCancel, onApply }: {
  title: string
  src: string
  initial: ImageFraming
  aspect: 'square' | 'cover'
  onCancel: () => void
  onApply: (value: ImageFraming) => void
}) {
  const [scale, setScale] = useState(initial.scale)
  const [offsetX, setOffsetX] = useState(initial.offsetX)
  const [offsetY, setOffsetY] = useState(initial.offsetY)
  const frameStyle = aspect === 'square'
    ? { width: 256, height: 256 }
    : { width: '100%' as const, aspectRatio: 370 / 184 }
  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#100e16' }}>
        <View style={s.header}>
          <Pressable accessibilityLabel="Cancelar encuadre" onPress={onCancel} style={s.iconBtn}><Text style={{ color: '#fff' }}>X</Text></Pressable>
          <Text style={s.title}>{title}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
          <FramedImage uri={src} framingValue={{ scale, offsetX, offsetY }} mode={aspect === 'square' ? 'contain' : 'cover'} style={[frameStyle, { alignSelf: 'center', backgroundColor: '#2a2730' }]} />
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: '#fff' }}>Zoom {scale.toFixed(2)}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button variant="secondary" onPress={() => setScale(v => Math.max(1, Number((v - 0.1).toFixed(2))))}>-</Button>
            <Button variant="secondary" onPress={() => setScale(v => Math.min(3, Number((v + 0.1).toFixed(2))))}>+</Button>
          </View>
          <Text style={{ color: '#fff' }}>Horizontal {offsetX}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button variant="secondary" onPress={() => setOffsetX(v => Math.max(-50, v - 5))}>-</Button>
            <Button variant="secondary" onPress={() => setOffsetX(v => Math.min(50, v + 5))}>+</Button>
          </View>
          <Text style={{ color: '#fff' }}>Vertical {offsetY}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button variant="secondary" onPress={() => setOffsetY(v => Math.max(-50, v - 5))}>-</Button>
            <Button variant="secondary" onPress={() => setOffsetY(v => Math.min(50, v + 5))}>+</Button>
          </View>
          <Button variant="secondary" onPress={() => { setScale(1); setOffsetX(0); setOffsetY(0) }}>Restablecer</Button>
          <Button onPress={() => onApply({ scale, offsetX, offsetY })}>Aplicar encuadre</Button>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

type FramingSession =
  | { mode: 'adjust'; kind: 'logo' | 'cover' }
  | { mode: 'pending'; media: { kind: 'logo' | 'cover'; mediaKey: string; url: string } }

export function ClubInfoScreen() {
  const access = useClubAccess()
  const insets = useSafeAreaInsets()
  const profile = useClubProfile(access.allowed ? access.clubId : null)
  const [menu, setMenu] = useState<'logo' | 'cover' | null>(null)
  const [confirm, setConfirm] = useState<'discard' | 'deactivate' | 'reactivate' | 'blocked' | null>(null)
  const [framingSession, setFramingSession] = useState<FramingSession | null>(null)
  const pendingNav = useRef<Href | null>(null)
  const busy = profile.saving || !!profile.uploading || profile.statusBusy

  usePreventRemove((profile.dirty || busy) && confirm !== 'discard', ({ data }) => {
    if (busy) return
    pendingNav.current = data.action.type === 'GO_BACK'
      ? (HOME as Href)
      : ((data.action.payload as { href?: string } | undefined)?.href as Href | undefined) ?? (HOME as Href)
    setConfirm('discard')
  })

  const pick = async (kind: 'logo' | 'cover') => {
    setMenu(null)
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    const uploaded = await profile.uploadMedia(kind, {
      uri: asset.uri,
      name: asset.fileName ?? `${kind}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize,
    })
    if (uploaded) setFramingSession({ mode: 'pending', media: uploaded })
  }

  if (access.phase === 'checking') return <View style={s.center}><ActivityIndicator /></View>
  if (access.phase === 'unverified') return <SessionUnverified />
  if (access.phase !== 'ready') return <Redirect href="/login" />
  if (access.destination?.kind !== 'club') return <Redirect href="/events" />

  const draft = profile.draft
  const framingSrc = framingSession && draft
    ? framingSession.mode === 'pending'
      ? framingSession.media.url
      : framingSession.kind === 'logo' ? draft.logoUrl : draft.coverPhotoUrl
    : null

  return (
    <StartupReady>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#100e16' }}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
          <View style={s.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver a Mi Club" disabled={busy} onPress={() => {
              if (profile.dirty) {
                pendingNav.current = HOME as Href
                setConfirm('discard')
                return
              }
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
                    <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
                      <View style={{
                        width: '100%',
                        ...(draft.coverPhotoUrl && !draft.clearCover
                          ? { aspectRatio: 370 / 184 }
                          : { height: 96 }),
                        backgroundColor: '#e7e7e8',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        {draft.coverPhotoUrl && !draft.clearCover
                          ? <FramedImage uri={draft.coverPhotoUrl} framingValue={draft.coverFraming} mode="cover" style={{ width: '100%', height: '100%' }} />
                          : <Pressable disabled={busy} onPress={() => void pick('cover')} style={{ alignSelf: 'center', backgroundColor: '#f7f7f7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                            <Text className="font-inter-500">Agregar portada</Text>
                          </Pressable>}
                        <Pressable style={s.editFab} onPress={() => setMenu('cover')} disabled={busy} accessibilityLabel="Editar portada">
                          <View style={s.editFabDisk}><SvgXml xml={EDIT_XML} width={18} height={18} /></View>
                        </Pressable>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16 }}>
                        <View style={{ width: 64, height: 64 }}>
                          <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#100e16', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                            {draft.logoUrl && !draft.clearLogo
                              ? <FramedImage uri={draft.logoUrl} framingValue={draft.logoFraming} mode="contain" style={{ width: '100%', height: '100%' }} />
                              : <Pressable disabled={busy} onPress={() => void pick('logo')} accessibilityLabel="Agregar logo"><Text style={{ color: '#fafaeb', fontSize: 24 }}>+</Text></Pressable>}
                          </View>
                          <Pressable style={[s.editFab, { right: -4, bottom: -4 }]} onPress={() => setMenu('logo')} disabled={busy} accessibilityLabel="Editar logo">
                            <View style={s.editFabDisk}><SvgXml xml={EDIT_XML} width={18} height={18} /></View>
                          </Pressable>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text className="font-inter-600" style={{ fontSize: 18 }} numberOfLines={1}>{draft.name || 'Club'}</Text>
                          <Pressable onPress={() => router.push('/club/settings/info/preview' as Href)}><Text className="font-inter-500" style={{ color: '#413f46' }}>Ver perfil público</Text></Pressable>
                        </View>
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
                    <ClubGeoFields
                      provinceId={draft.provinceId}
                      provinceName={draft.provinceName}
                      localityId={draft.localityId}
                      localityName={draft.localityName}
                      legacyLabel={!draft.provinceId && profile.saved?.legacyLocation
                        ? [profile.saved.legacyLocation.city, profile.saved.legacyLocation.countryDivision].filter(Boolean).join(', ')
                        : null}
                      disabled={busy}
                      errors={{ province: profile.fieldErrors.province, locality: profile.fieldErrors.locality }}
                      onProvince={province => profile.patch({
                        provinceId: province?.id ?? null,
                        provinceName: province?.name ?? null,
                        localityId: null,
                        localityName: null,
                        locationDirty: true,
                      })}
                      onLocality={locality => {
                        if (!locality) {
                          profile.patch({ localityId: null, localityName: null, locationDirty: true })
                          return
                        }
                        profile.patch({ localityId: locality.id, localityName: locality.name, locationDirty: true })
                      }}
                    />

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
                    setMenu(null)
                    setFramingSession({ mode: 'adjust', kind: menu! })
                  }}><Text style={s.sheetItem}>Ajustar encuadre</Text></Pressable>
                  <Pressable onPress={() => {
                    if (menu === 'logo') profile.patch({ clearLogo: true, logoUrl: null, logoKey: null, logoFraming: framing() })
                    else profile.patch({ clearCover: true, coverPhotoUrl: null, coverKey: null, coverFraming: framing() })
                    setMenu(null)
                  }}><Text style={[s.sheetItem, { color: '#d93e3e' }]}>Quitar</Text></Pressable>
                </>}
              <Pressable onPress={() => setMenu(null)}><Text style={[s.sheetItem, { color: '#605e64' }]}>Cancelar</Text></Pressable>
            </View>
          </Pressable>
        </Modal>

        {framingSession && framingSrc && (
          <FramingEditor
            title={(framingSession.mode === 'pending' ? framingSession.media.kind : framingSession.kind) === 'logo' ? 'Ajustar logo' : 'Ajustar portada'}
            src={framingSrc}
            initial={framingSession.mode === 'pending' ? framing() : framingSession.kind === 'logo' ? draft!.logoFraming : draft!.coverFraming}
            aspect={(framingSession.mode === 'pending' ? framingSession.media.kind : framingSession.kind) === 'logo' ? 'square' : 'cover'}
            onCancel={() => setFramingSession(null)}
            onApply={value => {
              if (framingSession.mode === 'pending') profile.applyUploaded(framingSession.media, value)
              else if (framingSession.kind === 'logo') profile.patch({ logoFraming: value })
              else profile.patch({ coverFraming: value })
              setFramingSession(null)
            }}
          />
        )}

        <Modal transparent visible={confirm != null} animationType="fade" onRequestClose={() => { if (!profile.statusBusy) setConfirm(null) }}>
          <View style={s.modalBg}><View style={s.dialog}>
            {confirm === 'discard' && <>
              <Text style={s.dialogTitle}>¿Descartar los cambios?</Text>
              <Button variant="secondary" onPress={() => { setConfirm(null); pendingNav.current = null }}>Seguir editando</Button>
              <Button onPress={() => {
                profile.discard()
                const dest = pendingNav.current ?? (HOME as Href)
                pendingNav.current = null
                setConfirm(null)
                // Navigate after clearing dirty so usePreventRemove does not re-block.
                requestAnimationFrame(() => router.replace(dest))
              }}>Descartar cambios</Button>
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
  editFab: { position: 'absolute', right: 8, bottom: 8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  editFabDisk: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 },
  section: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  help: { fontSize: 12, color: '#605e64' },
  modalBg: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 4 },
  sheetItem: { paddingVertical: 14, fontSize: 16 },
  dialog: { margin: 24, backgroundColor: '#fff', borderRadius: 16, padding: 24, gap: 12 },
  dialogTitle: { fontSize: 18, fontWeight: '600' },
})
