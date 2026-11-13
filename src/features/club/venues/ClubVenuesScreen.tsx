import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, useLocalSearchParams, usePreventRemove, type Href } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { SvgXml } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { useAuth } from '@/context/AuthContext'
import { apiClient } from '@/lib/api-client'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { StartupReady } from '@/features/startup/StartupReady'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { useInfrastructure, useVenueDraft } from './use-infrastructure'
import { catalogMatch, failureCode, failureCopy, parseLocation, pointValid, type Venue, type VenueLocation, type VenueWrite, type Province, type Locality } from './venues-model'
import { VenueMap } from './VenueMap'
import { venueIcons } from './venue-icons'

const HOME = '/club/settings', BASE = `${HOME}/venues`
const icons = venueIcons
function Icon({ name }: { name: keyof typeof icons }) {
  const icon = icons[name]
  return <SvgXml xml={icon.xml} width={icon.width} height={icon.height} />
}
function Notice({ children, error = false, success = false }: { children: ReactNode; error?: boolean; success?: boolean }) {
  return <View style={[s.notice, { backgroundColor: error ? '#fdecec' : success ? '#e9f9ef' : '#ebf3fe', borderColor: error ? '#fac5c5' : success ? '#baedcd' : '#c2d8fc' }]}>
    <Icon name={error ? 'error' : success ? 'check' : 'info'} /><Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" className="font-sans" style={[s.label, { flex: 1 }]}>{children}</Text>
  </View>
}
function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: ReactNode }) {
  return <View style={{ gap: 8 }}><Text className="font-inter-500" style={s.label}>{label}{required && <Text style={{ color: '#ef4444' }}> *</Text>}</Text>{children}{error && <Text accessibilityRole="alert" className="font-sans" style={[s.label, { color: '#aa3030' }]}>{error}</Text>}</View>
}
type Confirmation = { title: string; message: ReactNode; label: string; action?: () => void }
function ConfirmDialog({ value, cancel, busy, failure }: { value: Confirmation; cancel: () => void; busy: boolean; failure: string | null }) {
  const destructive = !failure && value.label.startsWith('Desactivar')
  return <Modal transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={() => { if (!busy) cancel() }}><View style={{ flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 14 }}><View accessibilityViewIsModal style={{ width: '100%', maxWidth: 374, maxHeight: '90%', alignSelf: 'center', borderRadius: 16, backgroundColor: '#fefefe', overflow: 'hidden', elevation: 4 }}>
    <View style={[s.row, { minHeight: 56, paddingLeft: 16, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: '#e7e7e8' }]}><Text accessibilityRole="header" className="font-inter-600" style={[s.label, { flex: 1 }]}>{value.title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar" disabled={busy} onPress={cancel} style={[s.iconButton, { height: 36, width: 36 }]}><Icon name="close" /></Pressable></View>
    <ScrollView contentContainerStyle={{ padding: 24 }}>{failure ? <Notice error>{failure}</Notice> : value.message}</ScrollView>
    <View style={[s.row, { marginHorizontal: 24, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#e7e7e8', gap: 12 }]}><Button disabled={busy} variant="secondary" onPress={cancel} style={[s.button, { flex: 1, borderWidth: 0, backgroundColor: '#e7e7e8' }]}>{value.action ? 'Cancelar' : 'Entendido'}</Button>{value.action && <Button onPress={value.action} loading={busy} className={busy ? 'disabled:opacity-100' : undefined} style={[s.button, { flex: 1, ...(destructive ? { backgroundColor: '#fdecec' } : {}) }]}><Text className="font-inter-500" style={[s.label, { color: destructive ? '#d93e3e' : '#120f18' }]}>{failure ? 'Reintentar' : value.label}</Text></Button>}</View>
  </View></View></Modal>
}
function Shell({ title, back, children, busy = false }: { title: string; back?: () => void; children: ReactNode; busy?: boolean }) {
  const insets = useSafeAreaInsets()
  return <StartupReady><SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#100e16' }}><StatusBar style="light" />
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}><View style={[s.header, { height: back ? 56 : 48 }]}>{back && <Pressable accessibilityRole="button" accessibilityLabel="Volver" disabled={busy} onPress={back} style={s.iconButton}><Icon name="back" /></Pressable>}<Text accessibilityRole="header" className="font-inter-700" style={{ color: '#fefefe', fontSize: 20, lineHeight: 28, flex: 1 }} numberOfLines={1}>{title}</Text></View>
      {children}<ClubBottomNav onDashboard={() => router.replace('/dashboard')} onClub={() => router.replace(HOME as Href)} busy={busy} bottomInset={insets.bottom} />
    </View></SafeAreaView></StartupReady>
}
function useClubAccess() {
  const { user, destination, phase } = useAuth()
  const context = destination?.kind === 'club' ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  return { phase, destination, allowed: phase === 'ready' && Boolean(context?.permissions?.includes('MANAGE_CLUB_SETTINGS')), clubId: context?.clubId ?? null }
}
function Gate({ children }: { children: ReactNode }) {
  const { phase, destination } = useClubAccess()
  if (phase === 'checking') return <View style={s.center}><ActivityIndicator accessibilityLabel="Validando sesión" /></View>
  if (phase === 'unverified') return <SessionUnverified />
  if (phase !== 'ready') return <Redirect href="/login" />
  if (destination?.kind !== 'club') return <Redirect href="/events" />
  return children
}
export function MyClubScreen() {
  const { allowed } = useClubAccess()
  return <Gate><Shell title="Mi Club"><ScrollView contentContainerStyle={{ padding: 16, paddingTop: 24, gap: 32 }}><Text className="font-sans" style={{ fontSize: 16, lineHeight: 24, color: '#605e64' }}>Gestioná la información y configuración de tu club</Text>
    {allowed ? <View style={{ gap: 12 }}>{[['Sedes y canchas', BASE], ['Reglas de categorías', `${HOME}/categories`]].map(([label, path]) => <Pressable key={path} accessibilityRole="button" onPress={() => router.push(path as Href)} style={[s.row, { gap: 20, minHeight: 56 }]}><Text className="font-sans" style={[s.label, { flex: 1, borderBottomWidth: 1, borderBottomColor: '#dedde0', paddingVertical: 16 }]}>{label}</Text><Icon name="arrow" /></Pressable>)}</View> : <Notice error>No tenés permiso para gestionar la configuración de este club.</Notice>}
  </ScrollView></Shell></Gate>
}
export function ClubVenuesScreen() {
  const access = useClubAccess(), params = useLocalSearchParams<{ parts?: string[]; saved?: string }>()
  const parts = Array.isArray(params.parts) ? params.parts : params.parts ? [params.parts] : []
  const { model, state } = useInfrastructure(access.allowed ? access.clubId : null)
  const [club, setClub] = useState<VenueLocation | null>(null), [clubStatus, setClubStatus] = useState('loading'), [attempt, retry] = useState(0)
  useEffect(() => {
    if (!access.allowed || !access.clubId) return
    const abort = new AbortController(); setClub(null); setClubStatus('loading')
    void apiClient.get<unknown>(`/clubs/${encodeURIComponent(access.clubId)}/location`, { signal: abort.signal, timeoutMs: 15000 }).then(value => { if (!abort.signal.aborted) { setClub(parseLocation(value)); setClubStatus('ready') } }).catch(() => { if (!abort.signal.aborted) setClubStatus('error') })
    return () => abort.abort()
  }, [access.allowed, access.clubId, attempt])
  const venue = state.venues.find(v => v.id === parts[0]), court = venue?.courts.find(c => c.id === parts[2])
  const newVenue = parts[0] === 'new', editVenue = newVenue || parts[1] === 'edit', editCourt = parts[1] === 'courts'
  const [dirty, setDirty] = useState(false), skipExit = useRef(false), pendingExit = useRef<(() => void) | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const dirtyChanged = useCallback((value: boolean) => setDirty(value), [])
  const confirmExit = (repeat: () => void) => setConfirmation({ title: '¿Descartar los cambios?', message: <Text className="font-sans" style={[s.label, s.gray]}>Tenés cambios sin guardar. Podés seguir editando o descartarlos.</Text>, label: 'Descartar cambios', action: () => { skipExit.current = true; setDirty(false); setConfirmation(null); repeat() } })
  usePreventRemove(access.phase === 'ready' && (dirty || state.saving), ({ repeat }) => {
    if (skipExit.current) { repeat(); return }
    if (state.saving) pendingExit.current = repeat
    else confirmExit(repeat)
  })
  useEffect(() => {
    if (access.phase !== 'ready') { pendingExit.current = null; return }
    if (state.saving || !pendingExit.current) return
    const repeat = pendingExit.current; pendingExit.current = null
    if (dirty && !skipExit.current) confirmExit(repeat); else repeat()
  }, [access.phase, state.saving, dirty])
  const go = (path: string) => { if (!state.saving) router.push(path as Href) }
  const back = () => router.replace((editVenue || editCourt ? venue ? `${BASE}/${venue.id}` : BASE : parts.length ? BASE : HOME) as Href)
  const saved = (path: string) => { skipExit.current = true; setDirty(false); router.replace(`${path}?saved=1` as Href) }
  const [failure, setFailure] = useState<string | null>(null)
  const mutate = async (operation: () => Promise<void>) => { setFailure(null); try { await operation(); setConfirmation(null) } catch (e) { const copy = failureCopy(e); if (['VENUE_HAS_PENDING_MATCHES', 'COURT_HAS_PENDING_MATCHES', 'PARENT_VENUE_INACTIVE'].includes(failureCode(e))) setConfirmation({ title: 'No se puede cambiar el estado', message: <Text className="font-sans" style={[s.label, s.gray]}>{copy}</Text>, label: 'Entendido' }); else setFailure(copy) } }
  const toggle = (active: boolean, courtId?: string) => {
    if (!venue || state.saving) return
    const operation = (confirm: boolean) => courtId ? model.setCourtStatus(venue.id, courtId, active, confirm) : model.setVenueStatus(venue.id, active, confirm)
    if (active) { void mutate(() => operation(false)); return }
    const last = courtId ? model.lastCourt() : model.lastVenue(venue.id)
    setFailure(null)
    const subject = courtId ? venue.courts.find(c => c.id === courtId)?.name ?? 'cancha' : venue.name
    setConfirmation({ title: `¿Desactivar ${subject}?`, message: <View style={{ gap: 16 }}><Text className="font-sans" style={[s.label, s.gray]}>{courtId ? 'La cancha dejará de estar disponible para nuevos partidos.' : 'Sus canchas dejarán de estar disponibles para nuevos partidos.'}{'\n\n'}{courtId ? 'Conservaremos sus datos y el historial.' : 'Conservaremos los datos y el historial. Al reactivar la sede, solo se habilitarán las canchas que estaban activas.'}</Text>{last && <View style={[s.notice, { backgroundColor: '#fef5e7', borderColor: '#fce1b3', alignItems: 'center' }]}><Icon name="warning" /><View style={{ flex: 1, gap: 2 }}><Text className="font-inter-600" style={s.label}>{courtId ? 'Es la última cancha activa disponible' : 'Es la última sede activa con canchas disponibles'}</Text><Text className="font-sans" style={[s.caption, s.gray]}>Podés continuar, pero no podrás programar nuevos partidos hasta tener una sede activa con una cancha activa.</Text></View></View>}</View>, label: `Desactivar ${courtId ? 'cancha' : 'sede'}`, action: () => void mutate(() => operation(last)) })
  }
  const title = newVenue ? 'Nueva sede' : editVenue ? 'Editar sede' : editCourt ? court ? 'Editar cancha' : 'Nueva cancha' : venue?.name ?? 'Sedes y canchas'
  const unavailable = !state.loading && parts.length > 0 && !newVenue && (!venue || editCourt && parts[2] !== 'new' && !court)
  return <Gate><Shell title={title} back={back} busy={state.saving}>
    {!access.allowed ? <View style={{ padding: 16 }}><Notice error>No tenés permiso para gestionar las sedes de este club.</Notice></View>
      : !state.loading && (state.loaded || !state.error) && !unavailable && editVenue && (!newVenue || clubStatus === 'ready') ? <VenueEditor key={venue?.id ?? 'new'} original={newVenue ? null : venue!} club={club} saving={state.saving} onDirty={dirtyChanged} onCancel={back} onSave={async body => { const result = await model.saveVenue(newVenue ? null : venue!.id, body); saved(`${BASE}/${result.id}`) }} />
      : !state.loading && (state.loaded || !state.error) && !unavailable && editCourt && venue ? <CourtEditor key={court?.id ?? 'new-court'} name={court?.name ?? ''} venue={venue} saving={state.saving} onDirty={dirtyChanged} onCancel={back} onSave={async name => { await model.saveCourt(venue.id, court?.id ?? null, name); saved(`${BASE}/${venue.id}`) }} />
      : <><RefreshableScrollView refreshing={state.refreshing} onRefresh={() => void model.load(true)} contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 12 }}>
        {(state.notice || params.saved === '1') && !state.loading && !state.error && <Notice success>{state.notice ?? 'Los cambios se guardaron correctamente.'}</Notice>}{failure && !confirmation && <Notice error>{failure}</Notice>}
        {state.loading && <View accessibilityLabel="Cargando sedes">{[0, 1, 2].map(i => <View key={i} style={{ height: 158, marginBottom: 12, borderRadius: 16, backgroundColor: '#dfdfdf' }} />)}</View>}
        {state.error && <><Notice error>No pudimos cargar las sedes.</Notice><Button onPress={() => void model.load()} style={s.button}>Reintentar</Button></>}
        {newVenue && clubStatus !== 'ready' && <><Notice error={clubStatus === 'error'}>{clubStatus === 'error' ? 'No pudimos precargar la ubicación del club.' : 'Cargando ubicación del club…'}</Notice>{clubStatus === 'error' && <Button onPress={() => retry(n => n + 1)} style={s.button}>Reintentar</Button>}</>}
        {unavailable && <Notice error>No encontramos esta sede o cancha.</Notice>}
        {!state.loading && (state.loaded || !state.error) && !parts.length && <><Text className="font-sans" style={s.label}>{state.venues.length} sedes · {state.venues.filter(v => v.status === 'ACTIVE').length} activas</Text>{state.venues.length === 0 && <Notice>Tu club todavía no tiene sedes. Agregá la primera para configurar sus canchas.</Notice>}{state.venues.map(v => <Pressable key={v.id} accessibilityRole="button" onPress={() => go(`${BASE}/${v.id}`)} style={[s.card, { minHeight: 158 }]}>
          <View style={[s.row, { justifyContent: 'space-between', gap: 8 }]}><Text className="font-inter-600" style={[s.subtitle, { flex: 1 }]}>{v.name}</Text><Text className="font-sans" style={[s.caption, { color: v.status === 'ACTIVE' ? '#078332' : '#605e64' }]}>● {v.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}</Text></View>
          <View style={[s.row, { alignItems: 'flex-start', gap: 8, marginTop: 4, paddingRight: 28 }]}><Icon name="pin" /><View style={{ flex: 1 }}><Text className="font-sans" style={[s.label, s.gray]}>{v.address || 'Dirección sin configurar'}</Text><Text className="font-sans" style={[s.caption, s.gray]}>{[v.city, v.country].filter(Boolean).join(', ') || 'Ubicación sin configurar'}</Text></View></View>
          <View style={[s.row, { alignItems: 'flex-start', gap: 8, marginTop: 12, paddingRight: 28 }]}><Icon name="court" /><View><Text className="font-inter-600" style={s.label}>{v.courtCount} {v.courtCount === 1 ? 'cancha' : 'canchas'}</Text><Text className="font-sans" style={[s.caption, s.gray]}>{v.status === 'INACTIVE' ? 'Sede inactiva: no permite programar' : `${v.activeCourtCount} activas · ${v.courtCount - v.activeCourtCount} inactivas`}</Text></View></View><View style={{ position: 'absolute', right: 16, top: '50%', marginTop: -12 }}><Icon name="arrow" /></View>
        </Pressable>)}</>}
        {!state.loading && (state.loaded || !state.error) && venue && !editVenue && !editCourt && <><View style={[s.card, { minHeight: 192 }]}><View style={[s.row, { gap: 12 }]}><Icon name="badge" /><Text className="font-inter-600" style={[s.heading, { flex: 1 }]}>Información de sede</Text><Pressable accessibilityLabel="Editar sede" accessibilityRole="button" disabled={state.saving} onPress={() => go(`${BASE}/${venue.id}/edit`)} style={s.iconButton}><Icon name="edit" /></Pressable></View><Text className="font-sans" style={[s.label, s.gray, { marginTop: 12 }]}>{venue.address || 'Dirección sin configurar'}{'\n'}{[venue.city, venue.country].filter(Boolean).join(', ')}</Text><View style={[s.row, { justifyContent: 'space-between', marginTop: 20 }]}><Text className="font-sans" style={[s.label, s.gray]}>Sede {venue.status === 'ACTIVE' ? 'activa' : 'inactiva'}</Text><Switch accessibilityLabel="Sede activa" value={venue.status === 'ACTIVE'} disabled={state.saving} onValueChange={value => toggle(value)} /></View></View>
          <View style={[s.row, { justifyContent: 'space-between', marginTop: 8 }]}><Text className="font-inter-600" style={s.heading}>Canchas</Text><Text className="font-sans" style={s.label}>{venue.courtCount} {venue.courtCount === 1 ? 'cancha' : 'canchas'}</Text></View>
          {venue.courts.length === 0 && <Notice>Esta sede todavía no tiene canchas.</Notice>}{venue.status === 'INACTIVE' && <Notice>La sede está inactiva. Sus canchas conservan su estado y no se pueden usar para programar partidos.</Notice>}
          {venue.courts.map(c => <View key={c.id} style={[s.card, s.row, { borderRadius: 16, minHeight: 72, gap: 8 }]}><Text className="font-inter-600" style={[s.subtitle, { flex: 1 }]}>{c.name}</Text><Text className="font-sans" style={[s.label, s.gray]}>{c.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}</Text><Switch accessibilityLabel={`${c.name} activa`} value={c.status === 'ACTIVE'} disabled={state.saving || venue.status === 'INACTIVE'} onValueChange={value => toggle(value, c.id)} /><Pressable accessibilityLabel={`Editar ${c.name}`} disabled={state.saving} onPress={() => go(`${BASE}/${venue.id}/courts/${c.id}/edit`)} style={[s.iconButton, { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff5e7' }]}><Icon name="editCourt" /></Pressable></View>)}
        </>}
      </RefreshableScrollView>{!editVenue && !editCourt && !unavailable && (!venue || venue.status === 'ACTIVE') && <View style={s.footer}><Button loading={state.loading} loadingLabel="Cargando sedes…" disabled={state.loading || state.error || state.saving} className={state.loading ? 'disabled:opacity-100' : undefined} style={[s.button, state.loading && { backgroundColor: '#eef0c1' }]} leftIcon={state.loading ? undefined : <Icon name="plus" />} onPress={() => go(venue ? `${BASE}/${venue.id}/courts/new` : `${BASE}/new`)}>{venue ? 'Agregar cancha' : 'Nueva sede'}</Button></View>}</>}
    {confirmation && <ConfirmDialog value={confirmation} busy={state.saving} failure={failure} cancel={() => { setConfirmation(null); setFailure(null) }} />}
  </Shell></Gate>
}
function FormFrame({ children, saving, valid, onSave, onCancel, label }: { children: ReactNode; saving: boolean; valid: boolean; onSave: () => void; onCancel: () => void; label: string }) {
  const insets = useSafeAreaInsets()
  // Header layout is already included in the local frame; compensate only the outer safe area.
  return <KeyboardAvoidingView keyboardVerticalOffset={insets.top} style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 24, gap: 16 }}>{children}</ScrollView><View style={[s.footer, { gap: 12, paddingBottom: 28 }]}><Button style={s.button} disabled={!valid || saving} loading={saving} loadingLabel="Guardando…" className={saving ? 'disabled:opacity-100' : undefined} onPress={onSave}>{label}</Button><Button variant="secondary" style={[s.button, { backgroundColor: '#e7e7e8', borderWidth: 0 }]} disabled={saving} onPress={onCancel}>Cancelar</Button></View></KeyboardAvoidingView>
}
function VenueEditor({ original, club, saving, onDirty, onSave, onCancel }: { original: Venue | null; club: VenueLocation | null; saving: boolean; onDirty: (value: boolean) => void; onSave: (body: VenueWrite) => Promise<void>; onCancel: () => void }) {
  const { model, state } = useVenueDraft(original, club), [error, setError] = useState<string | null>(null), [selector, setSelector] = useState<'province' | 'locality' | null>(null), [map, showMap] = useState(false), [provinceQuery, searchProvince] = useState('')
  useEffect(() => { onDirty(model.dirty); return () => onDirty(false) }, [model, state, onDirty])
  const center = model.validPoint ?? state.locality
  const submit = async () => { if (saving || !model.validate()) return; setError(null); try { await onSave(model.request()) } catch (e) { setError(failureCopy(e)) } }
  const ready = Boolean(state.name.trim() && state.address.trim() && state.province && state.locality && (!original || model.dirty))
  return <><FormFrame saving={saving} valid={ready} onSave={() => void submit()} onCancel={onCancel} label="Guardar sede">
    {error && <Notice error>{error}</Notice>}{original && !original.location && <Notice>Ubicación anterior: {[original.city, original.countryDivision, original.country].filter(Boolean).join(', ')}. Elegí la ubicación del catálogo para actualizarla.</Notice>}
    <Field label="Nombre" required error={state.errors.name}><Input accessibilityLabel="Nombre" editable={!saving} value={state.name} onChangeText={value => model.field('name', value)} placeholder="Ingresá nombre" maxLength={255} style={s.input} className="font-inter-500" /></Field>
    <Field label="País"><Input accessibilityLabel="País" value="Argentina" editable={false} style={[s.input, { backgroundColor: '#e7e7e8', color: '#605e64' }]} /></Field>
    <Field label="Provincia / jurisdicción" required error={state.errors.province}><Pressable accessibilityRole="button" accessibilityLabel={`Provincia: ${state.province?.name ?? 'Seleccionar provincia'}`} disabled={saving} onPress={() => { searchProvince(''); setSelector('province') }} style={[s.input, s.row, { justifyContent: 'space-between' }]}><Text className="font-inter-500" style={[s.label, !state.province && s.gray]}>{state.province?.name ?? 'Seleccionar provincia'}</Text><Icon name="chevron" /></Pressable></Field>
    <Field label="Ciudad / localidad" required error={state.errors.locality}><Pressable accessibilityRole="button" accessibilityLabel={`Localidad: ${state.locality?.name ?? 'Seleccionar localidad'}`} disabled={saving || !state.province} onPress={() => { setSelector('locality'); void model.localities('') }} style={[s.input, s.row, { justifyContent: 'space-between', opacity: state.province ? 1 : 0.5 }]}><Text className="font-inter-500" style={[s.label, !state.locality && s.gray]}>{state.locality?.name ?? 'Seleccionar localidad'}</Text><Icon name="chevron" /></Pressable></Field>
    <Field label="Dirección" required error={state.errors.address}><Input accessibilityLabel="Dirección" editable={!saving} value={state.address} onChangeText={value => model.field('address', value)} placeholder="Ingresá dirección" maxLength={500} style={s.input} className="font-inter-500" /></Field>
    <View style={{ gap: 12 }}><Notice><Text className="font-inter-600">{model.stalePoint ? 'Reconfirmá el punto de la sede' : model.validPoint ? 'Punto de sede confirmado' : 'Ubicación exacta (opcional)'}</Text>{'\n'}{model.stalePoint ? 'Cambió la dirección o localidad. Revisá el punto o continuá sin ubicación exacta.' : 'Podés confirmar el punto de la sede para que aparezca en búsquedas por cercanía.'}</Notice>
      <Button style={s.button} variant="secondary" disabled={saving || !center || !pointValid(center)} onPress={() => showMap(true)}>{model.validPoint ? 'Cambiar ubicación en mapa' : 'Elegir ubicación en mapa'}</Button>
      {!center || !pointValid(center) ? <Text className="font-sans" style={[s.caption, s.gray]}>Seleccioná una localidad del catálogo para abrir el mapa.</Text> : null}
      {state.point && <Button variant="ghost" disabled={saving} style={s.button} onPress={() => model.removePoint()}>Quitar ubicación exacta</Button>}
    </View>
  </FormFrame>
    <Modal visible={selector !== null} onRequestClose={() => setSelector(null)} animationType="slide"><SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}><View style={[s.row, { padding: 16, gap: 12 }]}><Text accessibilityRole="header" className="font-inter-600" style={[s.heading, { flex: 1 }]}>{selector === 'province' ? 'Seleccionar provincia' : 'Seleccionar localidad'}</Text><Button variant="ghost" onPress={() => setSelector(null)} style={s.button}>Cerrar</Button></View><View style={{ paddingHorizontal: 16 }}><Input accessibilityLabel={selector === 'province' ? 'Buscar provincia' : 'Buscar localidad'} placeholder="Buscar" value={selector === 'province' ? provinceQuery : state.query} onChangeText={value => { if (selector === 'province') searchProvince(value); else void model.localities(value) }} style={s.input} /></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
        {(selector === 'province' ? state.provinceStatus : state.localityStatus) === 'loading' && <ActivityIndicator accessibilityLabel="Cargando opciones" />}
        {(selector === 'province' ? state.provinceStatus : state.localityStatus) === 'error' && <><Notice error>No pudimos cargar el catálogo.</Notice><Button style={s.button} onPress={() => void (selector === 'province' ? model.provinces() : model.localities())}>Reintentar</Button></>}
        {(selector === 'province' ? state.provinces.filter(p => catalogMatch(p.name, provinceQuery)) : state.localities).map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: item.id === (selector === 'province' ? state.province?.id : state.locality?.id) }} onPress={() => { if (selector === 'province') void model.selectProvince(item as Province); else model.selectLocality(item as Locality); setSelector(null) }} style={{ minHeight: 48, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e7e7e8' }}><Text className="font-sans" style={s.label}>{item.name}</Text></Pressable>)}
        {selector === 'province' && state.provinceStatus === 'ready' && !state.provinces.some(p => catalogMatch(p.name, provinceQuery)) && <Text className="font-sans" style={s.label}>No encontramos provincias con esa búsqueda.</Text>}
        {selector === 'locality' && state.localityStatus === 'ready' && state.localities.length === 0 && <Text className="font-sans" style={s.label}>No encontramos localidades con esa búsqueda.</Text>}
        {selector === 'locality' && state.localities.length < state.total && state.localityStatus === 'ready' && <Button style={s.button} onPress={() => void model.localities(state.query, true)}>Cargar más localidades</Button>}
      </ScrollView></SafeAreaView></Modal>
    {map && center && pointValid(center) && <VenueMap center={center} initial={model.validPoint} onCancel={() => showMap(false)} onConfirm={point => { model.confirmPoint(point); showMap(false) }} />}
  </>
}
function CourtEditor({ name: initial, venue, saving, onDirty, onSave, onCancel }: { name: string; venue: Venue; saving: boolean; onDirty: (value: boolean) => void; onSave: (name: string) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(initial), [error, setError] = useState<string | null>(null)
  useEffect(() => { onDirty(name.trim() !== initial.trim()); return () => onDirty(false) }, [name, initial, onDirty])
  const submit = async () => { if (saving || !name.trim()) return; setError(null); try { await onSave(name.trim()) } catch (e) { setError(failureCopy(e)) } }
  return <FormFrame saving={saving} valid={Boolean(name.trim() && (!initial || name.trim() !== initial.trim()))} onSave={() => void submit()} onCancel={onCancel} label="Guardar cancha">
    {error && <Notice error>{error}</Notice>}<Field label="Sede"><View style={[s.card, s.row, { gap: 12, borderRadius: 16, paddingVertical: 12, paddingLeft: 12 }]}><Icon name="courtBadge" /><View style={{ flex: 1 }}><Text className="font-inter-600" style={s.subtitle}>{venue.name}</Text><Text className="font-inter-500" style={[s.label, s.gray, { marginTop: 2 }]}>{[venue.address, [venue.city, venue.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</Text></View></View></Field>
    <Field label="Nombre" required><Input accessibilityLabel="Nombre" style={s.input} value={name} editable={!saving} onChangeText={setName} placeholder="Ingresá nombre" maxLength={100} className="font-inter-500" /></Field>
  </FormFrame>
}
const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#100e16', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, lineHeight: 20, color: '#120f18' }, caption: { fontSize: 12, lineHeight: 16, color: '#120f18' },
  subtitle: { fontSize: 16, lineHeight: 24, color: '#120f18' }, heading: { fontSize: 18, lineHeight: 24, color: '#120f18' }, gray: { color: '#605e64' },
  card: { padding: 16, borderRadius: 20, backgroundColor: '#fff' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  input: { height: 56, borderRadius: 8, borderWidth: 1, borderColor: '#929195', backgroundColor: '#fefefe', paddingHorizontal: 16, fontSize: 14, lineHeight: 20, color: '#120f18' },
  button: { height: 44, borderRadius: 8 }, footer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
})
