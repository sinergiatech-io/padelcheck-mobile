import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, BackHandler, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchFieldIcon } from '@/components/icons/SearchFieldIcon'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { hubNotice, statusBackground } from './hub-model'
import { clubEvents } from './event-api'
import {
  availableInfrastructure, customNotice, eventDates, eventPrice, isCancellable, presets, statusLabels, toggleChoice, toggleVenue,
  validEventDates, validInfrastructure, venueLocation, type ClubEvent, type ClubEventDetail, type EventDraft,
} from './event-model'
import { detailKey, listKey, useEventDetail, useEventList, useEventSearch, useEventWizard } from './use-club-events'
import { Copy, EventIcon, Field, eventIcons, Icon, Notice, ROOT, Retry, Shell, push, replace, s, useManualRefresh } from './EventShell'
import { DivisionWizard } from './DivisionWizard'
import { DivisionScreen, DivisionsSection, useHubRefetch } from './DivisionsSection'
import { initialPlan, resumePlan, type DivisionPlan } from './division-model'

export function ClubEventsScreen() {
  const params = useLocalSearchParams<{ eventId?: string; parts?: string[] }>()
  const { user, destination, phase } = useAuth()
  if (phase === 'checking') return <ActivityIndicator accessibilityLabel="Validando sesión" />
  if (phase === 'unverified') return <SessionUnverified />
  if (phase !== 'ready') return <Redirect href="/login" />
  if (destination?.kind !== 'club') return <Redirect href="/events" />
  const clubId = destination.clubId
  const permissions = user?.accessContexts?.find(context => context.activity === 'CLUB' && context.clubId === clubId)?.permissions
  if (!permissions?.includes('MANAGE_TOURNAMENTS')) return <Shell title="Eventos"><Notice error>No tenés permiso para gestionar los eventos de este club.</Notice></Shell>
  if (params.eventId === 'new') return <Wizard key={clubId} clubId={clubId} />
  const parts = Array.isArray(params.parts) ? params.parts : params.parts ? [params.parts] : []
  if (params.eventId) return <EventScreen key={clubId + ':' + params.eventId + ':' + parts.join('/')} clubId={clubId} eventId={params.eventId} parts={parts} />
  return <EventList key={clubId} clubId={clubId} />
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



/** `parts`: [] hub · ['edit'] · ['divisions', 'new'] · ['divisions', id] · ['divisions', id, 'edit']. */
function divisionRoute(parts: string[]) {
  if (parts[0] !== 'divisions' || parts.length < 2 || parts.length > 3) return null
  if (parts[1] === 'new') return parts.length === 2 ? { divisionId: null, mode: 'new' as const } : null
  if (parts.length === 3 && parts[2] !== 'edit') return null
  return { divisionId: parts[1], mode: parts.length === 3 ? 'edit' as const : 'view' as const }
}

function EventScreen({ clubId, eventId, parts }: { clubId: string; eventId: string; parts: string[] }) {
  const query = useEventDetail(clubId, eventId)
  const refresh = useManualRefresh(useHubRefetch(clubId, eventId))
  const event = query.data
  if (event && parts[0] === 'edit' && event.status === 'DRAFT') return <Wizard clubId={clubId} event={event} />
  const division = divisionRoute(parts)
  if (event && division) return <DivisionScreen clubId={clubId} event={event} divisionId={division.divisionId} mode={division.mode} />
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
    <DivisionsSection clubId={clubId} event={event} />
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

function Wizard({ clubId, event }: { clubId: string; event?: ClubEventDetail }) {
  const cache = useQueryClient()
  const { step, setStep, draft, setDraft, calendar, preview, infrastructure } = useEventWizard(clubId, event)
  const [showVenues, setShowVenues] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [plan, setPlan] = useState<DivisionPlan>(initialPlan)
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
      if (step <= 1 || step >= 4) return false
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
      setPlan(current => ({ ...resumePlan(current), step: 4 }))
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

  if (step === 4 && !event) return <DivisionWizard clubId={clubId} draft={draft} back={back} plan={plan} setPlan={setPlan} />
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
  </Shell>
}


