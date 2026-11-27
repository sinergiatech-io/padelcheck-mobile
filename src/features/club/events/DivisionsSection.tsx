import { useEffect, useRef, useState } from 'react'
import { BackHandler, Modal, Pressable, Text, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { EventIcon, ROOT, Shell, push, replace, s } from './EventShell'
import { divisionApi } from './division-api'
import {
  activeDivisions, catalogNames, savedTitle, criterionLabel, divisionTitle, divisionWrite, emptySelection, errorCode, limitReason, planLimitRemaining,
  remainingQuota, savedCatalog, selectionSize, selectionSummary, toSelection, toWrites, validCriterion, validMaxPairs,
  validSelection, type Division, type Selection,
} from './division-model'
import { Banner, CardAction, CardActions, CatalogState, CriterionFields, DivisionCard, LimitBanner, QuotaFields, d } from './division-ui'
import { statusLabels, type ClubEventDetail } from './event-model'
import { categoryCount } from './hub-model'
import { detailKey, listKey } from './use-club-events'
import { divisionsKey, limitKey, useCatalog, useDivisionLimit, useDivisions } from './use-divisions'

/** One-shot «Cambios guardados» notice for the hub the editor returns to (navigation params stay clean). */
const savedNotice = new Set<string>()

function useAdmin(clubId: string) {
  const { user } = useAuth()
  return user?.accessContexts?.find(context => context.activity === 'CLUB' && context.clubId === clubId)?.role === 'CLUB_ADMIN'
}

function useRefreshEvent(clubId: string, eventId: string) {
  const cache = useQueryClient()
  return () => Promise.all([
    cache.invalidateQueries({ queryKey: divisionsKey(clubId, eventId) }),
    cache.invalidateQueries({ queryKey: limitKey(clubId, eventId) }),
    cache.invalidateQueries({ queryKey: detailKey(clubId, eventId) }),
    cache.invalidateQueries({ queryKey: listKey(clubId) }),
  ])
}

/**
 * Hub pull-to-refresh (MN3): one gesture re-reads the event, its categories and the plan limit.
 * Failures are reported by each query; the native indicator always stops.
 */
export function useHubRefetch(clubId: string, eventId: string) {
  const cache = useQueryClient()
  return () => Promise.allSettled([
    cache.refetchQueries({ queryKey: detailKey(clubId, eventId), exact: true }),
    cache.refetchQueries({ queryKey: divisionsKey(clubId, eventId), exact: true }),
    cache.refetchQueries({ queryKey: limitKey(clubId, eventId), exact: true }),
  ])
}

/** Hub «Categorías» (KAN-254 vocabulary): loading, error + retry, empty, one/many, cancelled history. */
export function DivisionsSection({ clubId, event }: { clubId: string; event: ClubEventDetail }) {
  const admin = useAdmin(clubId)
  const editable = event.status === 'DRAFT'
  const divisions = useDivisions(clubId, event.id)
  const limit = useDivisionLimit(clubId, event.id, editable)
  const refresh = useRefreshEvent(clubId, event.id)
  const [cancelling, setCancelling] = useState<Division | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const [saved] = useState(() => savedNotice.delete(event.id))

  const all = divisions.data ?? []
  const active = activeDivisions(all)
  const history = all.filter(division => division.status === 'CANCELLED')
  const remaining = remainingQuota(limit.data, active.length)
  const atLimit = editable && remaining === 0
  const base = ROOT + '/' + event.id + '/divisions'

  return <View style={s.gap} accessibilityLabel="Categorías">
    {saved && !cancelled && <Banner tone="success" title="Cambios guardados">La categoría se actualizó y el evento sigue en borrador.</Banner>}
    {cancelled && <Banner tone="success" title="Categoría cancelada">Historial conservado. Las demás categorías no cambian.</Banner>}
    <View style={s.categoryHeader}>
      <Text accessibilityRole="header" className="font-inter-600" style={s.sectionTitle}>Categorías</Text>
      {divisions.data && active.length > 0 && <Text className="font-sans" style={d.hint}>{categoryCount(active.length)}</Text>}
    </View>
    {divisions.isPending && <Banner tone="loading" title="Cargando categorías">Estamos consultando la configuración del evento.</Banner>}
    {divisions.isError && <>
      <Banner tone="error" title={divisions.data ? 'No pudimos actualizar las categorías' : 'No pudimos cargar las categorías'}>
        {divisions.data ? 'Mostramos lo último que cargamos. Deslizá hacia abajo o reintentá.' : 'Volvé a intentar para consultar y gestionar las categorías.'}
      </Banner>
      <Button variant="secondary" style={s.soft} onPress={() => void divisions.refetch()}>Reintentar</Button>
    </>}
    {divisions.data && active.length === 0 && <View style={s.categoriesEmpty}><EventIcon name="hubEmpty" />
      <Text className="font-inter-500" style={d.muted}>Todavía no hay categorías</Text>
      {editable && <Text className="font-sans" style={s.categoryHint}>Agregá una categoría para publicar el evento o abrir la inscripción.</Text>}
    </View>}
    {active.map(division => {
      const title = savedTitle(division)
      return <View key={division.id} style={d.gap8}>
        <DivisionCard title={title} maxPairs={division.maxPairs} type={criterionLabel(division)} substitutes={division.substitutesAllowed} />
        <CardActions>
          {editable ? <>
            <CardAction label="Editar" aria={'Editar ' + title} onPress={() => push(base + '/' + division.id + '/edit')} />
            <CardAction label="Cancelar categoría" aria={'Cancelar categoría ' + title} onPress={() => { setCancelled(false); setCancelling(division) }} />
          </> : <CardAction label="Consultar" aria={'Consultar ' + title} onPress={() => push(base + '/' + division.id)} />}
        </CardActions>
      </View>
    })}
    {history.length > 0 && <View style={s.gap}>
      <Text accessibilityRole="header" className="font-inter-600" style={d.muted}>Canceladas</Text>
      {history.map(division => <DivisionCard key={division.id} muted title={savedTitle(division)} maxPairs={division.maxPairs}
        type={criterionLabel(division)} substitutes={division.substitutesAllowed}
        footer={<View style={{ borderTopWidth: 1, borderTopColor: '#e7e7e8', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text className="font-inter-600" style={[d.label, { color: '#b51e15' }]}>Categoría cancelada</Text>
          <Text className="font-sans" style={d.hint}>Historial conservado. Las demás categorías no cambian.</Text>
        </View>} />)}
    </View>}
    {editable && divisions.data && <Button variant="secondary" style={[s.soft, atLimit && { backgroundColor: '#eef0c1' }]} className="disabled:opacity-100"
      disabled={atLimit} onPress={() => push(base + '/new')}>
      <Text className="font-inter-500" style={[d.label, atLimit && { color: '#605e64' }]}>Agregar categoría</Text>
    </Button>}
    {atLimit && limit.data && <LimitBanner admin={admin} reason={limitReason(limit.data.limit ?? 0, limit.data.planCode, 'hub')} />}
    {cancelling && <CancelDivisionDialog clubId={clubId} eventId={event.id} division={cancelling}
      close={() => setCancelling(null)}
      done={() => { setCancelling(null); setCancelled(true); void refresh() }} />}
  </View>
}

function CancelDivisionDialog({ clubId, eventId, division, close, done }: {
  clubId: string; eventId: string; division: Division; close: () => void; done: () => void
}) {
  const pending = useRef(false)
  const cache = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  async function cancel() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError(false)
    try {
      const result = await divisionApi.cancel(clubId, eventId, division.id)
      cache.setQueryData<Division[]>(divisionsKey(clubId, eventId), list => list?.map(item => item.id === result.id ? result : item))
      done()
    } catch {
      setError(true)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!pending.current) close() }}>
    <View style={s.overlay}><View style={s.dialog} accessibilityViewIsModal>
      <View style={s.dialogHeader}>
        <Text accessibilityRole="header" className="font-inter-600" style={s.sectionTitle}>¿Cancelar esta categoría?</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" accessibilityState={{ disabled: busy }} disabled={busy} onPress={close}><EventIcon name="modalClose" /></Pressable>
      </View>
      <View style={s.dialogContent}>
        <Text className="font-inter-600" style={s.strong}>{savedTitle(division)}</Text>
        <Text className="font-sans" style={d.muted}>Se conservará su historial y las demás categorías del evento no se modificarán.</Text>
        {busy && <Banner tone="loading" title="Cancelando categoría">Esperá a que termine la operación.</Banner>}
        {error && <Banner tone="error" title="No pudimos cancelar">La categoría sigue activa. Volvé a intentar.</Banner>}
        <View style={[s.row, { gap: 12, paddingTop: 12 }]}>
          <Button variant="secondary" style={[s.soft, s.flex]} disabled={busy} onPress={close}>Volver</Button>
          <Button variant="secondary" style={[s.danger, s.flex]} className={busy ? 'disabled:opacity-100' : undefined} loading={busy}
            loadingLabel="Cancelando categoría" onPress={() => void cancel()}>
            <Text className="font-inter-500" style={s.dangerText}>Cancelar categoría</Text>
          </Button>
        </View>
      </View>
    </View></View>
  </Modal>
}

/**
 * Hub add / edit / view of one category. DRAFT: configuration (KAN-77 3090:33678) then quota and
 * substitutes (3088:33060). Outside DRAFT the quota screen is read-only (3094:33750).
 */
export function DivisionScreen({ clubId, event, divisionId, mode }: {
  clubId: string; event: ClubEventDetail; divisionId: string | null; mode: 'new' | 'edit' | 'view'
}) {
  const divisions = useDivisions(clubId, event.id)
  const division = divisionId ? divisions.data?.find(item => item.id === divisionId) : undefined
  const leave = () => replace(ROOT + '/' + event.id)
  if (divisionId && divisions.isSuccess && !division) {
    return <Shell title="Consultar división" wizard back={leave}><Banner tone="error" title="No encontramos la división">Volvé al evento para ver sus categorías.</Banner></Shell>
  }
  if (divisionId && !division) {
    return <Shell title="Editar división" wizard back={leave}>
      {divisions.isPending && <Banner tone="loading" title="Cargando división">Estamos consultando la configuración del evento.</Banner>}
      {divisions.isError && <>
        <Banner tone="error" title="No pudimos cargar la división">Volvé a intentar para consultar y gestionar la categoría.</Banner>
        <Button variant="secondary" style={s.soft} onPress={() => void divisions.refetch()}>Reintentar</Button>
      </>}
    </Shell>
  }
  const readOnly = event.status !== 'DRAFT' || division?.status === 'CANCELLED' || mode === 'view'
  if (division && readOnly) return <DivisionView event={event} division={division} leave={leave} />
  if (!division && event.status !== 'DRAFT') return <Shell title="Agregar división" wizard back={leave}>
    <Banner tone="error" title="El evento ya no está en borrador">Volvé al evento para ver su estado.</Banner>
  </Shell>
  return <DivisionEditor key={division?.id ?? 'new'} clubId={clubId} event={event} division={division} leave={leave}
    activeCount={activeDivisions(divisions.data ?? []).length} />
}

function useBack(handler: () => void) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { ref.current(); return true })
    return () => listener.remove()
  }, [])
}

function DivisionView({ event, division, leave }: { event: ClubEventDetail; division: Division; leave: () => void }) {
  const selection = toSelection([divisionWrite(division)])
  useBack(leave)
  return <Shell title="Consultar división" wizard back={leave} footer={<Button style={s.button} onPress={leave}>Volver al evento</Button>}>
    <Text className="font-sans" style={d.hint}>{division.status === 'CANCELLED' ? 'Categoría cancelada' : statusLabels[event.status]}</Text>
    <Text accessibilityRole="header" className="font-inter-700" style={{ fontSize: 20, lineHeight: 28, color: '#120f18' }}>{savedTitle(division)}</Text>
    <Text className="font-inter-500" style={d.muted}>{selectionSummary(selection, savedCatalog(division))}</Text>
    <QuotaFields selection={selection} set={() => undefined} touched={false} fixed />
  </Shell>
}

function DivisionEditor({ clubId, event, division, leave, activeCount }: {
  clubId: string; event: ClubEventDetail; division?: Division; leave: () => void; activeCount: number
}) {
  const admin = useAdmin(clubId)
  const catalog = useCatalog()
  const limit = useDivisionLimit(clubId, event.id)
  const refresh = useRefreshEvent(clubId, event.id)
  const [selection, setSelection] = useState<Selection>(() => division ? toSelection([divisionWrite(division)]) : emptySelection())
  const [step, setStep] = useState<'config' | 'quota'>('config')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [overflow, setOverflow] = useState(false)
  const [rejected, setRejected] = useState<number | null>(null)
  const pending = useRef(false)
  const categories = catalog.data ?? []
  const editing = Boolean(division)
  const remaining = editing ? null : remainingQuota(limit.data, activeCount)
  const batchTooLarge = remaining !== null && selectionSize(selection) > remaining
  const reason = (left?: number) => limitReason(limit.data?.limit ?? 0, limit.data?.planCode ?? '', 'hub', left)
  const set = (next: Selection) => { setOverflow(false); setSelection(next) }

  function back() {
    if (pending.current) return
    if (step === 'quota') { setStep('config'); setFailed(null); return }
    leave()
  }
  useBack(back)

  async function save() {
    if (pending.current) return
    if (!validSelection(selection, categories)) { setTouched(true); return }
    pending.current = true
    setBusy(true)
    setFailed(null)
    setRejected(null)
    try {
      if (division) await divisionApi.update(clubId, event.id, division.id, toWrites(selection)[0])
      else await divisionApi.createBatch(clubId, event.id, toWrites(selection))
      await refresh()
      if (editing) savedNotice.add(event.id)
      leave()
    } catch (error) {
      const left = planLimitRemaining(error)
      if (left !== null) {
        setRejected(left)
        void limit.refetch()
      } else {
        const code = errorCode(error)
        setFailed(code === 'EVENT_NOT_DRAFT' || code === 'DIVISION_NOT_DRAFT'
          ? 'El evento ya no está en borrador. Volvé al evento para ver su estado.'
          : 'Conservamos los cambios. Volvé a intentar.')
      }
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  const title = editing ? 'Editar división' : 'Agregar división'
  if (step === 'config') {
    return <Shell title={title} wizard back={back}
      footer={<Button style={s.button} disabled={!catalog.isSuccess || !validCriterion(selection, categories) || batchTooLarge}
        onPress={() => setStep('quota')}>Continuar</Button>}>
      <Text className="font-sans" style={d.hint}>Evento en borrador · Configuración</Text>
      <Text accessibilityRole="header" className="font-inter-700" style={{ fontSize: 20, lineHeight: 28, color: '#120f18' }}>{title}</Text>
      {!catalog.isSuccess && <CatalogState pending={catalog.isPending} error={catalog.isError} retry={() => void catalog.refetch()} genderType={selection.genderType} />}
      {catalog.isSuccess && <>
        <Text className="font-inter-500" style={d.muted}>{editing ? 'Actualizá la configuración de esta división.' : 'Definí quiénes pueden competir.'}</Text>
        <CriterionFields selection={selection} set={set} catalog={categories} single={editing}
          canAdd={next => remaining === null || next <= remaining} onOverflow={() => setOverflow(true)} />
        {(overflow || batchTooLarge) && remaining !== null && <LimitBanner admin={admin} reason={reason(remaining)} />}
      </>}
    </Shell>
  }
  const invalid = !validMaxPairs(selection.maxPairsText) || selection.substitutesAllowed === null
  return <Shell title={title} wizard back={back}
    footer={<View style={{ gap: 8 }}>
      <Button variant="secondary" style={s.soft} disabled={busy} onPress={leave}>Volver sin guardar</Button>
      <Button style={s.button} className={busy ? 'disabled:opacity-100' : undefined} disabled={invalid} loading={busy}
        loadingLabel="Guardando división" onPress={() => void save()}>{editing ? 'Guardar cambios' : 'Guardar división'}</Button>
    </View>}>
    <Text className="font-sans" style={d.hint}>Evento en borrador</Text>
    <Text accessibilityRole="header" className="font-inter-700" style={{ fontSize: 20, lineHeight: 28, color: '#120f18' }}>
      {editing ? divisionTitle(toWrites(selection)[0], catalogNames(categories)) : 'Cupo de la división'}</Text>
    <Text className="font-inter-500" style={d.muted}>{selectionSummary(selection, categories)}</Text>
    {failed && <Banner tone="error" title="No pudimos guardar">{failed}</Banner>}
    {rejected !== null && <LimitBanner admin={admin} reason={reason(rejected)} />}
    <QuotaFields selection={selection} busy={busy} touched={touched || selection.maxPairsText !== ''} set={next => { setTouched(true); setSelection(next) }} />
  </Shell>
}
