import { useEffect, useRef, useState } from 'react'
import { BackHandler, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { ROOT, Shell, replace, s } from './EventShell'
import { divisionApi, type EventDraftWrite } from './division-api'
import {
  catalogNames, clearIntent, criterionLabel, divisionTitle, emptySelection, errorCode, intentKey, limitReason,
  planLimitRemaining, remainingQuota, resumePlan, selectionSize, selectionSummary, toSelection, toWrites, validCriterion,
  validMaxPairs, validSelection, withoutLocalId, type DivisionPlan, type Selection, type WizardDivision,
} from './division-model'
import { Banner, CardAction, CardActions, CatalogState, CriterionFields, DivisionCard, LimitBanner, QuotaFields, d } from './division-ui'
import type { ClubEventDetail, EventDraft } from './event-model'
import { detailKey, listKey } from './use-club-events'
import { divisionsKey, useCatalog, useDivisionLimit } from './use-divisions'

const logo = require('../../../../assets/auth/logo.png')
let sequence = 0
const localId = () => 'local-' + Date.now().toString(36) + '-' + (++sequence)
const newKey = () => 'wizard-' + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2))

/**
 * Process-wide slot for the wizard intent (Idempotency-Key + payload fingerprint). It survives the
 * screen being unmounted and remounted while the app runs, like sessionStorage does on the web.
 */
const intents = new Map<string, string>()
export const intentStore = {
  getItem: (key: string) => intents.get(key) ?? null,
  setItem: (key: string, value: string) => { intents.set(key, value) },
  removeItem: (key: string) => { intents.delete(key) },
}

export function DivisionWizard({ clubId, draft, back, plan, setPlan }: {
  clubId: string; draft: EventDraft; back: () => void; plan: DivisionPlan; setPlan: (update: (plan: DivisionPlan) => DivisionPlan) => void
}) {
  const cache = useQueryClient()
  const { user } = useAuth()
  const admin = user?.accessContexts?.find(context => context.activity === 'CLUB' && context.clubId === clubId)?.role === 'CLUB_ADMIN'
  const catalog = useCatalog()
  const limit = useDivisionLimit(clubId, null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const [rejected, setRejected] = useState<number | null>(null)
  const [created, setCreated] = useState<ClubEventDetail | null>(null)
  const pending = useRef(false)
  const memory = useRef<{ fingerprint: string; key: string } | null>(null)
  const categories = catalog.data ?? []
  const names = catalogNames(categories)
  const { step, selection, divisions } = plan
  const set = (next: Selection) => { setOverflow(false); setPlan(value => ({ ...value, selection: next })) }

  const others = divisions.filter(division => !plan.editing?.includes(division.localId)).length
  const remaining = remainingQuota(limit.data, others)
  const batchTooLarge = remaining !== null && selectionSize(selection) > remaining
  const reason = (left?: number) => limitReason(limit.data?.limit ?? 0, limit.data?.planCode ?? '', 'wizard', left)
  const reviewRemaining = remainingQuota(limit.data, divisions.length)

  function goBack() {
    if (pending.current) return
    setFailed(false)
    if (step === 6) {
      setPlan(value => ({ ...resumePlan(value), step: value.lastBatch.length && value.divisions.some(item => value.lastBatch.includes(item.localId)) ? 5 : 4 }))
      return
    }
    if (step === 5) { setPlan(value => ({ ...value, step: 4 })); return }
    if (plan.fromReview) { setPlan(value => ({ ...value, step: 6, editing: null, fromReview: false, selection: emptySelection() })); return }
    back()
  }
  const backRef = useRef(goBack)
  backRef.current = goBack
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (created) return true
      backRef.current()
      return true
    })
    return () => listener.remove()
  }, [created])

  function commit() {
    if (!validSelection(selection, categories)) { setPlan(value => ({ ...value, touched: true })); return }
    setPlan(value => {
      const items = toWrites(value.selection).map(write => ({ ...write, localId: localId() }))
      const editing = value.editing
      const at = editing ? value.divisions.findIndex(division => editing.includes(division.localId)) : -1
      const kept = value.divisions.filter(division => !editing?.includes(division.localId))
      const position = at < 0 ? kept.length : value.divisions.slice(0, at).filter(division => !editing?.includes(division.localId)).length
      return {
        ...value, step: 6, divisions: [...kept.slice(0, position), ...items, ...kept.slice(position)],
        lastBatch: items.map(item => item.localId), editing: null, fromReview: false, selection: emptySelection(), touched: false,
      }
    })
    setRejected(null)
  }

  function add() {
    if (pending.current || reviewRemaining === 0) return
    setPlan(value => ({ ...value, step: 4, editing: null, fromReview: true, selection: emptySelection(), touched: false }))
  }

  function edit(division: WizardDivision) {
    if (pending.current) return
    setPlan(value => ({ ...value, step: 4, editing: [division.localId], fromReview: true, selection: toSelection([division]), touched: false }))
  }

  function remove(division: WizardDivision) {
    if (pending.current) return
    setPlan(value => ({ ...value, divisions: value.divisions.filter(item => item.localId !== division.localId) }))
    if (divisions.length === 1) setBlocked(true)
    setRejected(null)
  }

  async function confirm() {
    if (pending.current) return
    if (divisions.length === 0) { setBlocked(true); return }
    const event: EventDraftWrite = {
      name: draft.name.trim(), startDate: draft.startDate, endDate: draft.endDate,
      playCalendarPreset: draft.playCalendarPreset, venueIds: draft.venueIds, courtIds: draft.courtIds,
    }
    const items = divisions.map(withoutLocalId)
    const fingerprint = JSON.stringify({ event, items })
    const key = memory.current?.fingerprint === fingerprint ? memory.current.key : intentKey(intentStore, clubId, fingerprint, newKey)
    memory.current = { fingerprint, key }
    pending.current = true
    setBusy(true)
    setFailed(false)
    setRejected(null)
    try {
      const saved = await divisionApi.confirm(clubId, key, event, items)
      clearIntent(intentStore, clubId)
      memory.current = null
      cache.setQueryData(detailKey(clubId, saved.event.id), saved.event)
      cache.setQueryData(divisionsKey(clubId, saved.event.id), saved.divisions)
      void cache.invalidateQueries({ queryKey: listKey(clubId) })
      setCreated(saved.event)
    } catch (error) {
      const left = planLimitRemaining(error)
      if (left !== null) {
        setRejected(left)
        void limit.refetch()
      } else {
        if (errorCode(error) === 'IDEMPOTENCY_KEY_REUSED') { clearIntent(intentStore, clubId); memory.current = null }
        setFailed(true)
      }
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  if (created) return <Success event={created} />

  const catalogReady = catalog.isSuccess
  const continueDisabled = step === 4
    ? !catalogReady || !validCriterion(selection, categories) || batchTooLarge
    : !validMaxPairs(selection.maxPairsText) || selection.substitutesAllowed === null

  if (step === 4 || step === 5) {
    return <Shell title="Crear evento" wizard back={goBack}
      footer={<Button style={s.button} disabled={continueDisabled}
        onPress={() => step === 4 ? setPlan(value => ({ ...value, step: 5 })) : commit()}>Continuar</Button>}>
      <Text className="font-sans" style={d.hint}>{step === 4 ? 'Paso 4 de 6 · Divisiones' : 'Paso 5 de 6 · Cupo y suplentes'}</Text>
      {step === 4 && <>
        <Text accessibilityRole="header" className="font-inter-700" style={w.title}>Agregar división</Text>
        {!catalogReady && <CatalogState pending={catalog.isPending} error={catalog.isError} retry={() => void catalog.refetch()} genderType={selection.genderType} />}
        {catalogReady && <>
          <Text className="font-inter-500" style={d.muted}>Definí quiénes pueden competir.</Text>
          <CriterionFields selection={selection} set={set} catalog={categories} single={Boolean(plan.editing && plan.fromReview)}
            canAdd={next => remaining === null || next <= remaining} onOverflow={() => setOverflow(true)} />
          {(overflow || batchTooLarge) && remaining !== null && <LimitBanner admin={admin} reason={reason(remaining)} />}
        </>}
      </>}
      {step === 5 && <>
        <Text accessibilityRole="header" className="font-inter-700" style={w.title}>Cupo de la división</Text>
        <Text className="font-inter-500" style={d.muted}>{selectionSummary(selection, categories)}</Text>
        <QuotaFields selection={selection} touched={plan.touched || selection.maxPairsText !== ''}
          set={next => setPlan(value => ({ ...value, selection: next, touched: true }))} />
      </>}
    </Shell>
  }

  return <Shell title="Crear evento" wizard back={goBack}
    footer={<Button style={s.button} className={busy ? 'disabled:opacity-100' : undefined} disabled={divisions.length === 0}
      loading={busy} loadingLabel="Creando evento" onPress={() => void confirm()}>Crear evento</Button>}>
    <Text className="font-sans" style={d.hint}>Paso 6 de 6 · Revisión</Text>
    <Text accessibilityRole="header" className="font-inter-700" style={w.title}>Divisiones del evento</Text>
    <Text className="font-inter-500" style={d.muted}>{divisions.length === 0
      ? 'Agregá al menos una división para crear el evento.' : 'Revisá las divisiones antes de crear el evento.'}</Text>
    {busy && <Banner tone="loading" title="Creando evento">No cierres esta pantalla mientras guardamos.</Banner>}
    {failed && <Banner tone="error" title="No pudimos crear el evento">Tus datos siguen en el formulario. Volvé a intentar.</Banner>}
    {rejected !== null && <LimitBanner admin={admin} reason={reason(rejected)} />}
    {divisions.length === 0 && (blocked
      ? <Banner tone="error" title="No se puede confirmar">Agregá al menos una división válida para continuar.</Banner>
      : <Banner tone="info" title="Todavía no agregaste divisiones">Agregá al menos una división válida para continuar.</Banner>)}
    {divisions.map(division => <View key={division.localId} style={d.gap8}>
      <DivisionCard title={divisionTitle(division, names)} maxPairs={division.maxPairs} type={criterionLabel(division)} substitutes={division.substitutesAllowed} />
      <CardActions>
        <CardAction label="Editar" aria={'Editar ' + divisionTitle(division, names)} disabled={busy} onPress={() => edit(division)} />
        <CardAction label="Quitar" aria={'Quitar ' + divisionTitle(division, names)} disabled={busy} onPress={() => remove(division)} />
      </CardActions>
    </View>)}
    <Button variant="secondary" style={[s.soft, (busy || reviewRemaining === 0) && w.disabledSoft]} className="disabled:opacity-100"
      disabled={busy || reviewRemaining === 0} onPress={add}>
      <Text className="font-inter-500" style={[d.label, (busy || reviewRemaining === 0) && { color: '#929195' }]}>Agregar división</Text>
    </Button>
    {reviewRemaining === 0 && rejected === null && <LimitBanner admin={admin} reason={reason()} />}
    <Text className="font-sans" style={d.hint}>Al confirmar, el evento queda en borrador. Las inscripciones se abren después desde el evento.</Text>
  </Shell>
}

/** DRAFT success (3090:33794). «Ver evento» replaces the wizard so Back does not return to it. */
function Success({ event }: { event: ClubEventDetail }) {
  const insets = useSafeAreaInsets()
  return <SafeAreaView edges={['top']} style={w.success}><StatusBar style="light" />
    <ScrollView contentContainerStyle={w.successBody}>
      <Text accessibilityRole="header" className="font-inter-700" style={w.successTitle}>¡Creaste un evento!</Text>
      <Image source={logo} accessibilityLabel="Padel Check" resizeMode="contain" style={{ width: 140, height: 140 }} />
      <View style={{ gap: 16 }}>
        <Text className="font-inter-700" style={w.successName}>{event.name}</Text>
        <Text className="font-inter-600" style={w.successText}>Tu evento quedó en borrador. Podés revisarlo y abrir las inscripciones desde el evento.</Text>
      </View>
    </ScrollView>
    <View style={{ paddingHorizontal: 32, paddingTop: 16, paddingBottom: Math.max(24, insets.bottom) }}>
      <Button style={s.button} onPress={() => replace(ROOT + '/' + event.id)}>Ver evento</Button>
    </View>
  </SafeAreaView>
}

const w = StyleSheet.create({
  title: { fontSize: 20, lineHeight: 28, color: '#120f18' },
  disabledSoft: { backgroundColor: '#f5f5f5' },
  success: { flex: 1, backgroundColor: '#120f18' },
  successBody: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 32, paddingHorizontal: 32 },
  successTitle: { fontSize: 20, lineHeight: 28, color: '#fefefe', textAlign: 'center' },
  successName: { fontSize: 32, lineHeight: 40, color: '#fefefe', textAlign: 'center' },
  successText: { fontSize: 18, lineHeight: 24, color: '#c4c3c7', textAlign: 'center' },
})
