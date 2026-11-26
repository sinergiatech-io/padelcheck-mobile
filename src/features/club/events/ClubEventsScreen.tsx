import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, BackHandler, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { SvgUri, SvgXml } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchFieldIcon } from '@/components/icons/SearchFieldIcon'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { StartupReady } from '@/features/startup/StartupReady'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { venueIcons } from '../venues/venue-icons'
import { categoryCount, hubNotice, statusBackground } from './hub-model'
import { clubEvents } from './event-api'
import {
  availableInfrastructure, customNotice, eventDates, eventPrice, isCancellable, presets, statusLabels, toggleChoice, toggleVenue,
  validEventDates, validInfrastructure, venueLocation, type ClubEvent, type ClubEventDetail, type EventDraft,
} from './event-model'
import { detailKey, listKey, useEventDetail, useEventList, useEventSearch, useEventWizard } from './use-club-events'

const eventIcons = {
  hubMenu: Image.resolveAssetSource(require('@/assets/club-events/hub-menu.svg')),
  hubEmpty: Image.resolveAssetSource(require('@/assets/club-events/hub-empty.svg')),
  hubCalendarNotice: Image.resolveAssetSource(require('@/assets/club-events/hub-calendar-notice.svg')),
  hubCancelled: Image.resolveAssetSource(require('@/assets/club-events/hub-cancelled.svg')),
  menuOpen: Image.resolveAssetSource(require('@/assets/club-events/menu-open.svg')),
  menuPublish: Image.resolveAssetSource(require('@/assets/club-events/menu-publish.svg')),
  menuEdit: Image.resolveAssetSource(require('@/assets/club-events/menu-edit.svg')),
  menuCancel: Image.resolveAssetSource(require('@/assets/club-events/menu-cancel.svg')),
  modalClose: Image.resolveAssetSource(require('@/assets/club-events/modal-close.svg')),
  listPin: Image.resolveAssetSource(require('@/assets/club-events/list-pin.svg')),
  listDate: Image.resolveAssetSource(require('@/assets/club-events/list-date.svg')),
  listArrow: Image.resolveAssetSource(require('@/assets/club-events/list-arrow.svg')),
  hubPin: Image.resolveAssetSource(require('@/assets/club-events/hub-pin.svg')),
  hubDate: Image.resolveAssetSource(require('@/assets/club-events/hub-date.svg')),
  hubPrice: Image.resolveAssetSource(require('@/assets/club-events/hub-price.svg')),
}
const ROOT = '/club/events'
const replace = (path: string) => router.replace(path as Href)
const push = (path: string) => router.push(path as Href)
type Continuation = (draft: EventDraft, back: () => void) => ReactNode

export function ClubEventsScreen({ continuation }: { continuation?: Continuation }) {
  const params = useLocalSearchParams<{ eventId?: string; parts?: string[] }>()
  const { user, destination, phase } = useAuth()
  if (phase === 'checking') return <ActivityIndicator accessibilityLabel="Validando sesión" />
  if (phase === 'unverified') return <SessionUnverified />
  if (phase !== 'ready') return <Redirect href="/login" />
  if (destination?.kind !== 'club') return <Redirect href="/events" />
  const clubId = destination.clubId
  const permissions = user?.accessContexts?.find(context => context.activity === 'CLUB' && context.clubId === clubId)?.permissions
  if (!permissions?.includes('MANAGE_TOURNAMENTS')) return <Shell title="Eventos"><Notice error>No tenés permiso para gestionar los eventos de este club.</Notice></Shell>
  if (params.eventId === 'new') return <Wizard key={clubId} clubId={clubId} continuation={continuation} />
  if (params.eventId) return <EventScreen key={clubId + ':' + params.eventId} clubId={clubId} eventId={params.eventId}
    editing={params.parts?.[0] === 'edit'} />
  return <EventList key={clubId} clubId={clubId} />
}

function Icon({ name }: { name: keyof typeof venueIcons }) {
  const { xml, width, height } = venueIcons[name]
  return <SvgXml xml={xml} width={width} height={height} />
}

function EventIcon({ name }: { name: keyof typeof eventIcons }) {
  const size = name === 'hubCalendarNotice' || name === 'hubCancelled' ? 20 : 24
  return <SvgUri uri={eventIcons[name]?.uri ?? null} width={size} height={size} />
}

function Copy({ children, strong = false, small = false, muted = false }: {
  children: ReactNode; strong?: boolean; small?: boolean; muted?: boolean
}) {
  return <Text className={strong ? 'font-inter-600' : 'font-sans'}
    style={[s.copy, strong && s.strong, small && s.small, muted && s.muted]}>{children}</Text>
}

function Shell({ title, children, footer, back, headerAction, hub = false, wizard = false, refresh }: {
  title: string; children: ReactNode; footer?: ReactNode; back?: () => void; headerAction?: ReactNode; hub?: boolean; wizard?: boolean
  refresh?: { refreshing: boolean; onRefresh: () => void }
}) {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const initials = [user?.firstName, user?.lastName].map(name => name?.[0] ?? '').join('')
  const contentStyle = [s.content, hub && s.hubContent, wizard && s.wizardContent]
  return <StartupReady><SafeAreaView edges={['top']} style={s.safe}><StatusBar style="light" />
    <KeyboardAvoidingView style={[s.body, wizard && s.wizardBody]} behavior={wizard && Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        {back && <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={back} style={s.iconButton}><Icon name="back" /></Pressable>}
        <Text accessibilityRole="header" className="font-inter-700" numberOfLines={1} style={s.heading}>{title}</Text>
        {headerAction}
        {!back && initials !== '' && <View style={s.avatar}><Copy small>{initials}</Copy></View>}
      </View>
      {refresh ? <RefreshableScrollView style={s.scroll} contentContainerStyle={contentStyle} alwaysBounceVertical
        keyboardShouldPersistTaps="handled" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>{children}</RefreshableScrollView>
        : <ScrollView style={s.scroll} contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">{children}</ScrollView>}
      {footer && <View style={[s.footer, wizard && { paddingBottom: Math.max(24, insets.bottom) }]}>{footer}</View>}
      {!wizard && <ClubBottomNav selectedLabel="Eventos" onDashboard={() => replace('/dashboard')}
        onClub={() => replace('/club/settings')} bottomInset={insets.bottom} />}
    </KeyboardAvoidingView>
  </SafeAreaView></StartupReady>
}

function useManualRefresh(refetch: () => Promise<unknown>) {
  const pending = useRef(false)
  const [refreshing, setRefreshing] = useState(false)
  async function refresh() {
    if (pending.current) return
    pending.current = true
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      pending.current = false
      setRefreshing(false)
    }
  }
  return { refreshing, onRefresh: () => void refresh() }
}

function EventList({ clubId }: { clubId: string }) {
  const query = useEventList(clubId)
  const search = useEventSearch(query.data ?? [])
  const refresh = useManualRefresh(query.refetch)
  return <Shell title="Eventos" refresh={refresh} footer={<Button style={s.button} onPress={() => push(ROOT + '/new')}>Crear evento</Button>}>
    <View>
      <Input accessibilityLabel="Buscar eventos" placeholder="Buscar eventos" value={search.search}
        onChangeText={search.setSearch} style={s.search} />
      <View pointerEvents="none" style={s.searchIcon}><SearchFieldIcon /></View>
    </View>
    {query.isPending && <View accessible accessibilityLabel="Cargando eventos" style={s.gap}>
      {[1, 2].map(item => <View key={item} style={s.skeleton} />)}
    </View>}
    {query.isError && <Retry retry={() => void query.refetch()}>No pudimos cargar los eventos.</Retry>}
    {query.data && search.searching && <View accessibilityLiveRegion="polite" style={[s.notice, s.info]}>
      <EventIcon name="listDate" /><View style={s.flex}><Copy strong>Buscando eventos</Copy><Copy small muted>Esperá un momento.</Copy></View>
    </View>}
    {query.data && !search.searching && search.events.length === 0 && <View style={s.empty}>
      <Copy strong>{search.search.trim() ? 'Sin resultados' : 'Todavía no hay eventos'}</Copy>
      <Copy muted>{search.search.trim() ? 'Probá otra búsqueda.' : 'Creá un evento para empezar.'}</Copy>
      {search.search.trim() !== '' && <Button variant="secondary" style={s.soft} onPress={() => search.setSearch('')}>Limpiar búsqueda</Button>}
    </View>}
    {search.events.map(event => <EventCard key={event.id} event={event} />)}
  </Shell>
}

function EventCard({ event }: { event: ClubEvent }) {
  const location = venueLocation(event.venues)
  return <View style={s.eventCard}>
    <LinearGradient colors={['#e5e8a0', '#eef0c1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cover}>
      <View style={[s.badge, event.status === 'INSCRIPTION_OPEN' && s.openBadge]}><Copy small>{statusLabels[event.status]}</Copy></View>
    </LinearGradient>
    <View style={s.eventContent}>
      <View style={s.row}>
        <Text className="font-inter-600" style={[s.strong, s.flex, event.status !== 'DRAFT' && { textAlign: 'center' }]}>{event.name}</Text>
        {event.status === 'DRAFT' && <Pressable accessibilityRole="link" accessibilityLabel={'Editar ' + event.name}
          style={s.edit} onPress={() => push(ROOT + '/' + event.id + '/edit')}><Icon name="edit" /></Pressable>}
      </View>
      <Copy muted>{event.venues.map(venue => venue.name).join(' y ')}</Copy>
      {location !== '' && <View style={s.row}><EventIcon name="listPin" /><Copy small muted>{location}</Copy></View>}
      <View style={s.row}><EventIcon name="listDate" /><Copy small muted>{eventDates(event.startDate, event.endDate)}</Copy></View>
      <Pressable accessibilityRole="link" onPress={() => push(ROOT + '/' + event.id)} style={s.linkRow}>
        <Text className="font-inter-600" style={s.link}>Ver detalles</Text><EventIcon name="listArrow" />
      </Pressable>
    </View>
  </View>
}

function Notice({ children, error = false, success = false }: { children: ReactNode; error?: boolean; success?: boolean }) {
  return <View accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite"
    style={[s.notice, error ? s.error : success ? s.success : s.warning]}>
    <Icon name={error ? 'error' : success ? 'check' : 'info'} /><View style={s.flex}><Copy>{children}</Copy></View>
  </View>
}

function Retry({ children, retry }: { children: ReactNode; retry: () => void }) {
  return <View style={s.gap}><Notice error>{children}</Notice>
    <Button variant="secondary" style={s.soft} onPress={retry}>Reintentar</Button></View>
}

function EventScreen({ clubId, eventId, editing }: { clubId: string; eventId: string; editing: boolean }) {
  const query = useEventDetail(clubId, eventId)
  const refresh = useManualRefresh(query.refetch)
  const event = query.data
  if (event && editing && event.status === 'DRAFT') return <Wizard clubId={clubId} event={event} />
  const loadError = query.isError && <View style={s.hubGap}>
    <Notice error><Text className="font-inter-600">No pudimos cargar el evento</Text>{'\n'}Volvé a intentar para ver su información.</Notice>
    <Button style={s.button} onPress={() => void query.refetch()}>Reintentar</Button>
  </View>
  if (event) return <EventHub clubId={clubId} event={event} loadError={loadError} refresh={refresh} />
  return <Shell title="Gestión del evento" hub refresh={refresh} back={() => replace(ROOT)}>
    {query.isPending && <View accessible accessibilityLabel="Cargando evento" style={s.hubSkeleton} />}
    {loadError}
  </Shell>
}

function HubSummary({ event }: { event: ClubEventDetail }) {
  const venue = [event.venues.map(item => item.name).join(' y '), venueLocation(event.venues)].filter(Boolean).join(' · ')
  return <View style={[s.eventCard, s.hubSummary]}>
    <View style={s.summaryTop}>
      <Text className="font-inter-600" style={[s.strong, s.flex]}>{event.name}</Text>
      <View style={[s.badge, { backgroundColor: statusBackground(event.status) }]}><Copy small>{statusLabels[event.status]}</Copy></View>
    </View>
    {venue !== '' && <View style={s.row}><EventIcon name="hubPin" /><View style={s.flex}><Copy muted>{venue}</Copy></View></View>}
    <View style={s.row}><EventIcon name="hubDate" /><Copy muted>{eventDates(event.startDate, event.endDate)}</Copy></View>
    <View style={s.row}><EventIcon name="hubPrice" /><Copy muted>{eventPrice(event.entryFee)}</Copy></View>
  </View>
}

function EventHub({ clubId, event, loadError, refresh }: {
  clubId: string; event: ClubEventDetail; loadError: ReactNode; refresh: { refreshing: boolean; onRefresh: () => void }
}) {
  const cache = useQueryClient()
  const insets = useSafeAreaInsets()
  const [sheet, setSheet] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const pending = useRef(false)
  const notice = hubNotice(event)
  const editable = event.status === 'DRAFT'
  const cancellable = isCancellable(event.status)
  const openConfirm = () => { setError(false); setSheet(false); setConfirm(true) }

  async function cancel() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError(false)
    try {
      const saved = await clubEvents.cancel(clubId, event.id)
      await cache.cancelQueries({ queryKey: detailKey(clubId, event.id) })
      cache.setQueryData(detailKey(clubId, event.id), saved)
      void cache.invalidateQueries({ queryKey: listKey(clubId) })
      setConfirm(false)
    } catch {
      setError(true)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return <Shell title="Gestión del evento" hub back={() => replace(ROOT)} refresh={refresh}
    headerAction={cancellable && <Pressable accessibilityRole="button" accessibilityLabel="Acciones del evento"
      accessibilityState={{ expanded: sheet }} onPress={() => setSheet(true)} style={s.more}>
      <EventIcon name="hubMenu" />
    </Pressable>}>
    {loadError}
    <HubSummary event={event} />
    {notice && <View accessibilityLiveRegion="polite" style={[s.notice, notice.tone === 'warning' ? s.hubWarning : s.hubNeutral]}>
      <EventIcon name={notice.tone === 'warning' ? 'hubCalendarNotice' : 'hubCancelled'} />
      <View style={s.flex}><Text className="font-inter-600" style={s.copy}>{notice.title}</Text>
        <Copy small muted>{notice.detail}</Copy></View>
    </View>}
    {event.schedulingMode && <Copy muted>Programación {event.schedulingMode === 'AUTO' ? 'automática' : 'manual'}</Copy>}
    <View style={s.gap}>
      <View style={s.categoryHeader}>
        <Text accessibilityRole="header" className="font-inter-600" style={s.sectionTitle}>Categorías</Text>
        {event.divisionCount > 0 && <Copy small muted>{categoryCount(event.divisionCount)}</Copy>}
      </View>
      {event.divisionCount === 0 && <View style={s.categoriesEmpty}><EventIcon name="hubEmpty" />
        <Copy muted>Todavía no hay categorías</Copy>
        {editable && <Text className="font-sans" style={s.categoryHint}>Agregá una categoría para publicar el evento o abrir la inscripción.</Text>}
      </View>}
    </View>
    <Modal visible={sheet || confirm} transparent animationType="fade" onRequestClose={() => {
      if (!busy) { setConfirm(false); setSheet(false) }
    }}>
      {sheet && cancellable && <View style={s.sheetOverlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar acciones" style={StyleSheet.absoluteFill} onPress={() => setSheet(false)} />
        <View style={[s.sheet, { paddingBottom: Math.max(24, insets.bottom) }]} accessibilityViewIsModal>
          <View style={s.handle} />
          <Text accessibilityRole="header" className="font-inter-600" style={s.sectionTitle}>Acciones del evento</Text>
          <ScrollView bounces={false}>
            {editable && <>
              {event.divisionCount === 0 && <>
                <EventAction icon="menuOpen" label="Abrir inscripción" detail="Requiere al menos una categoría" />
                <EventAction icon="menuPublish" label="Publicar" detail="Requiere al menos una categoría" />
              </>}
              <EventAction icon="menuEdit" label="Editar evento" detail="Nombre, sede y fechas" onPress={() => {
                setSheet(false)
                push(ROOT + '/' + event.id + '/edit')
              }} />
            </>}
            <View style={editable && s.menuDivider}>
              <EventAction icon="menuCancel" label="Cancelar evento" detail="Pide confirmación · se conserva el historial" destructive onPress={openConfirm} />
            </View>
          </ScrollView>
        </View>
      </View>}
      {confirm && <View style={s.overlay}><View style={s.dialog} accessibilityViewIsModal>
        <View style={s.dialogHeader}><Copy strong>¿Cancelar este evento?</Copy>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" disabled={busy} onPress={() => setConfirm(false)}><EventIcon name="modalClose" /></Pressable></View>
        <View style={s.dialogContent}>
          <Copy strong>{event.name}</Copy>
          <Copy muted>El evento quedará cancelado. Se conservarán su historial y las inscripciones existentes.</Copy>
          {error && <Notice error>No pudimos cancelar el evento. Podés volver a intentarlo.</Notice>}
          <View style={s.row}>
            <Button variant="secondary" style={[s.soft, s.flex]} disabled={busy} onPress={() => setConfirm(false)}>Volver</Button>
            <Button variant="secondary" style={[s.danger, s.flex]} className={busy ? 'disabled:opacity-100' : undefined} loading={busy} loadingLabel="Cancelando evento" onPress={() => void cancel()}>
              <Text className="font-inter-500" style={s.dangerText}>Cancelar evento</Text>
            </Button>
          </View>
        </View>
      </View></View>}
    </Modal>
  </Shell>
}

function EventAction({ icon, label, detail, destructive = false, onPress }: {
  icon: keyof typeof eventIcons; label: string; detail: string; destructive?: boolean; onPress?: () => void
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !onPress }}
    disabled={!onPress} onPress={onPress} style={s.menuAction}>
    <EventIcon name={icon} />
    <View style={s.flex}>
      <Text className="font-inter-600" style={[s.copy, destructive ? s.dangerText : !onPress && s.muted]}>{label}</Text>
      <Copy small muted>{detail}</Copy>
    </View>
  </Pressable>
}

function Choice({ label, checked, onPress, radio = false, subtitle }: {
  label: string; checked: boolean; onPress: () => void; radio?: boolean; subtitle?: string
}) {
  return <Pressable accessibilityRole={radio ? 'radio' : 'checkbox'} accessibilityState={{ checked }} onPress={onPress}
    style={[s.choice, radio && s.radio, radio && checked && s.selected]}>
    {!radio && <View style={[s.checkbox, checked && s.checked]}>{checked && <Text style={s.check}>✓</Text>}</View>}
    <View style={s.flex}><Copy strong={radio} muted={!radio}>{label}</Copy>{subtitle && <Copy muted>{subtitle}</Copy>}</View>
    {radio && <View style={[s.circle, checked && s.activeCircle]}>{checked && <View style={s.dot} />}</View>}
  </Pressable>
}

function Wizard({ clubId, event, continuation }: { clubId: string; event?: ClubEventDetail; continuation?: Continuation }) {
  const cache = useQueryClient()
  const { step, setStep, draft, setDraft, calendar, preview, infrastructure } = useEventWizard(clubId, event)
  const [showVenues, setShowVenues] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const pending = useRef(false)
  const options = infrastructure.data ?? []
  const selected = options.filter(venue => draft.venueIds.includes(venue.id))
  const available = availableInfrastructure(draft, options)
  const removedResources = available.venueIds.length !== draft.venueIds.length ||
    available.courtIds.length !== draft.courtIds.length
  const set = (values: Partial<EventDraft>) => setDraft(current => ({ ...current, ...values }))
  const back = () => {
    if (pending.current) return
    if (step > 1) setStep(step - 1)
    else replace(event ? ROOT + '/' + event.id : ROOT)
  }
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pending.current) return true
      if (step <= 1) return false
      setStep(step - 1)
      return true
    })
    return () => listener.remove()
  }, [step, setStep])

  async function next() {
    if (pending.current) return
    if (step === 1 && !validEventDates(draft)) {
      setInvalid(true)
      return
    }
    if (step < 3) {
      setStep(step + 1)
      return
    }
    if (!event) {
      setStep(4)
      return
    }
    pending.current = true
    setBusy(true)
    setError(false)
    try {
      const saved = await clubEvents.update(clubId, event.id, { ...draft, name: draft.name.trim() })
      await cache.cancelQueries({ queryKey: detailKey(clubId, event.id) })
      cache.setQueryData(detailKey(clubId, event.id), saved)
      void cache.invalidateQueries({ queryKey: listKey(clubId) })
      replace(ROOT + '/' + event.id)
    } catch {
      setError(true)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  if (step === 4 && continuation) return continuation(draft, back)
  const disabled = step === 2 && !draft.playCalendarPreset || step === 3 &&
    (!infrastructure.data || !validInfrastructure(draft, infrastructure.data))
  return <Shell title={event ? 'Editar evento' : 'Crear evento'} wizard back={back}
    footer={step < 4 && <View style={{ gap: 8 }}>{event && <Button variant="secondary" style={s.soft} disabled={busy} onPress={() => replace(ROOT + '/' + event.id)}>Volver sin guardar</Button>}<Button style={s.button} className={busy ? 'disabled:opacity-100' : undefined} disabled={disabled} loading={busy} loadingLabel="Guardando evento" onPress={() => void next()}>{event && step === 3 ? 'Guardar' : 'Siguiente'}</Button></View>}>
    <Copy muted>Paso {step} de {event ? 3 : 6}</Copy>
    {step === 1 && <>
      <Copy strong>Datos del evento</Copy>
      <Field label="Nombre del evento"><Input style={s.field} accessibilityLabel="Nombre del evento" maxLength={255} value={draft.name} onChangeText={name => set({ name })} /></Field>
      <Field label="Fecha de inicio"><Input style={s.field} accessibilityLabel="Fecha de inicio, año mes día" placeholder="AAAA-MM-DD" maxLength={10} value={draft.startDate} onChangeText={startDate => set({ startDate })} /></Field>
      <Field label="Fecha de finalización"><Input style={s.field} accessibilityLabel="Fecha de finalización, año mes día" placeholder="AAAA-MM-DD" maxLength={10} value={draft.endDate} onChangeText={endDate => set({ endDate })} /></Field>
      {invalid && !validEventDates(draft) && <Notice error>Completá el nombre y las fechas. La fecha de finalización debe ser igual o posterior al inicio.</Notice>}
    </>}
    {step === 2 && <>
      <Copy strong>Calendario de juego</Copy>
      <Copy muted>{eventDates(draft.startDate, draft.endDate)} · Horario base del club</Copy>
      {presets.map(preset => <Choice key={preset.value} radio label={preset.title} subtitle={preset.subtitle}
        checked={draft.playCalendarPreset === preset.value} onPress={() => set({ playCalendarPreset: preset.value })} />)}
      {draft.playCalendarPreset === 'CUSTOM' && <Notice>{customNotice}</Notice>}
      {preview.isFetching && <ActivityIndicator accessibilityLabel="Consultando horarios" color="#a9b12b" />}
      {preview.isError && <Retry retry={() => void preview.refetch()}>No pudimos consultar los horarios.</Retry>}
      {calendar && draft.playCalendarPreset !== 'CUSTOM' && <Notice success={calendar.status === 'COMPLETE'}>
        <Text className="font-inter-600">{calendar.status === 'COMPLETE' ? 'Calendario completo' : 'Horarios a confirmar'}</Text>
        {calendar.days.slice(0, 3).map(day => '\n' + eventDates(day.date, day.date) + ' · ' + day.intervals.map(interval => interval.open.slice(0, 5) + '–' + interval.close.slice(0, 5)).join(' y '))}
      </Notice>}
    </>}
    {step === 3 && <>
      <Copy strong>Sedes y canchas</Copy>
      <Copy muted>Seleccioná al menos una sede y una cancha para continuar.</Copy>
      {infrastructure.isPending && <ActivityIndicator accessibilityLabel="Cargando sedes y canchas" color="#a9b12b" />}
      {infrastructure.isError && <Retry retry={() => void infrastructure.refetch()}>No pudimos cargar las sedes.</Retry>}
      {infrastructure.data?.length === 0 && <Notice>No hay sedes activas en el club.</Notice>}
      {infrastructure.data && infrastructure.data.length > 0 && <>
        <Copy muted>{selected.length} sedes · {draft.courtIds.length} canchas seleccionadas</Copy>
        <Button variant="secondary" style={s.soft} accessibilityState={{ expanded: showVenues }} onPress={() => setShowVenues(!showVenues)}>Agregar sede</Button>
        {showVenues && <View style={s.venue}>{infrastructure.data.map(venue => <Choice key={venue.id} label={venue.name} checked={draft.venueIds.includes(venue.id)}
          onPress={() => setDraft(current => toggleVenue(current, venue))} />)}</View>}
        {selected.map(venue => <View key={venue.id} style={s.venue}>
          <Copy strong>{venue.name} · {venue.courts.length} canchas</Copy>
          {venue.courts.length === 0 && <Copy muted>Esta sede no tiene canchas activas.</Copy>}
          {venue.courts.map(court => <Choice key={court.id} label={court.name} checked={draft.courtIds.includes(court.id)}
            onPress={() => { if (!pending.current) setDraft(current => ({ ...current, courtIds: toggleChoice(current.courtIds, court.id) })) }} />)}
        </View>)}
        {removedResources && <Retry retry={() => set(available)}>Hay recursos que ya no están disponibles.</Retry>}
      </>}
      {error && <Notice error>No pudimos guardar el evento. Tus cambios siguen disponibles para reintentar.</Notice>}
    </>}
    {step === 4 && <><Copy strong>Categorías</Copy><Notice>La configuración de categorías todavía no está disponible.</Notice></>}
  </Shell>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <View style={{ gap: 8 }}><Text className="font-inter-500" style={s.copy}>{label} <Text style={s.dangerText}>*</Text></Text>{children}</View>
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#120f18' },
  body: { flex: 1, backgroundColor: '#f6f6f6' },
  wizardBody: { backgroundColor: '#fefefe' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#120f18', height: 56, gap: 8, paddingHorizontal: 16 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#c9cf38', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  heading: { color: '#fefefe', fontSize: 20, lineHeight: 28, flex: 1 },
  iconButton: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: 16, paddingHorizontal: 16, paddingVertical: 24 },
  hubContent: { gap: 28, paddingTop: 20 },
  hubGap: { gap: 28 },
  hubSkeleton: { height: 160, borderRadius: 16, backgroundColor: '#dedede' },
  more: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  hubSummary: { padding: 15, gap: 10 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  hubWarning: { borderColor: '#ffdca8', backgroundColor: '#fcf4e6' },
  hubNeutral: { borderColor: '#e7e7e8', backgroundColor: '#f6f6f6' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 18, lineHeight: 28, color: '#120f18' },
  categoriesEmpty: { alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#dedde0', backgroundColor: '#fefefe', borderRadius: 16, padding: 8 },
  categoryHint: { maxWidth: 192, fontSize: 12, lineHeight: 16, color: '#605e64' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#120f1866' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#fefefe', paddingHorizontal: 20, paddingTop: 8 },
  handle: { alignSelf: 'center', height: 4, width: 36, borderRadius: 4, backgroundColor: '#c4c3c7', marginBottom: 16 },
  menuAction: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 62 },
  menuDivider: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e7e7e8', paddingTop: 8 },
  wizardContent: { paddingHorizontal: 32 },
  footer: { paddingHorizontal: 32, paddingBottom: 24, paddingTop: 16 },
  button: { height: 48, borderRadius: 8 },
  soft: { height: 48, borderRadius: 8, borderWidth: 0, backgroundColor: '#f8f8e9' },
  danger: { height: 48, borderRadius: 8, borderWidth: 0, backgroundColor: '#fdecec' },
  dangerText: { color: '#b51e15' },
  copy: { color: '#120f18', fontSize: 14, lineHeight: 20 },
  strong: { color: '#120f18', fontSize: 16, lineHeight: 24 },
  small: { fontSize: 12, lineHeight: 16 },
  muted: { color: '#605e64' },
  search: { height: 40, borderRadius: 16, borderWidth: 1, borderColor: '#b6b5b7', backgroundColor: '#fefefe', paddingLeft: 47, paddingRight: 16, fontSize: 14 },
  searchIcon: { position: 'absolute', left: 16, top: 8 },
  field: { height: 56, borderRadius: 8, borderWidth: 1, borderColor: '#929195', backgroundColor: '#fefefe', paddingHorizontal: 16, fontSize: 14 },
  gap: { gap: 12 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  flex: { flex: 1 },
  skeleton: { height: 259, borderRadius: 16, backgroundColor: '#dedede' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 16 },
  eventCard: { borderWidth: 1, borderColor: '#e7e7e8', borderRadius: 16, backgroundColor: '#fefefe', overflow: 'hidden' },
  cover: { height: 110, alignItems: 'flex-end', padding: 12 },
  badge: { borderRadius: 8, backgroundColor: '#dedde0', paddingHorizontal: 8, paddingVertical: 4 },
  openBadge: { backgroundColor: '#c9cf38' },
  eventContent: { gap: 4, paddingHorizontal: 16, paddingVertical: 8 },
  edit: { height: 40, width: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5e7' },
  linkRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', alignItems: 'center', minHeight: 32, marginTop: 8 },
  link: { color: '#6b7009', fontSize: 14, lineHeight: 20 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 12, borderRadius: 8 },
  info: { borderColor: '#c2d8fc', backgroundColor: '#ebf3fe' },
  warning: { borderColor: '#ffdca8', backgroundColor: '#fff5e7' },
  error: { borderColor: '#fac5c5', backgroundColor: '#fdecec' },
  success: { borderColor: '#baedcd', backgroundColor: '#e9f9ef' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8, backgroundColor: '#0006' },
  dialog: { width: '100%', maxWidth: 374, borderRadius: 16, backgroundColor: '#fefefe', overflow: 'hidden' },
  dialogHeader: { minHeight: 52, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e7e7e8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dialogContent: { gap: 16, padding: 16 },
  choice: { flexDirection: 'row', minHeight: 56, alignItems: 'center', gap: 24, paddingHorizontal: 16 },
  radio: { minHeight: 64, borderRadius: 12, paddingLeft: 12, paddingRight: 30, backgroundColor: '#fdfdfc' },
  selected: { backgroundColor: '#f8f8e9' },
  circle: { borderRadius: 10, width: 20, height: 20, borderWidth: 2, borderColor: '#605e64', alignItems: 'center', justifyContent: 'center' },
  activeCircle: { borderColor: '#a9b12b' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#a9b12b' },
  checkbox: { width: 18, height: 18, borderWidth: 2, borderRadius: 2, borderColor: '#605e64', alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: '#a9b12b', borderColor: '#a9b12b' },
  check: { color: '#fff', fontWeight: 'bold', fontSize: 13, lineHeight: 14 },
  venue: { padding: 12, borderRadius: 16, backgroundColor: '#f6f7f8' },
})
