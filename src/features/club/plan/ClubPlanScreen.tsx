import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, AppState, BackHandler, Linking, Pressable, Text, View } from 'react-native'
import { Redirect, router, type Href } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import Svg, { Path } from 'react-native-svg'
import { SvgXml } from 'react-native-svg'
import { SearchFieldIcon } from '@/components/icons/SearchFieldIcon'
import { Button } from '@/components/ui/button'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { useRefreshControl } from '@/hooks/use-refresh-control'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api-client'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { StartupReady } from '@/features/startup/StartupReady'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { venueIcons } from '../venues/venue-icons'
import { planApi, planFailure } from './plan-api'
import { PlanJourney, type PlanStep } from './PlanJourney'
import { useClubPlan } from './use-club-plan'
import {
  capabilityLines,
  catalogMaterial,
  chargeBanner,
  chargeMaterial,
  completeChoice,
  conflictOutcome,
  decideOpen,
  meterCaption,
  meterLabel,
  meterValue,
  pendingBanner,
  planHeadline,
  primaryAction,
  quoteMaterial,
  resumeConfirmation,
  sameServerUrl,
  upgradeChoices,
  usageBanners,
  type AdjustmentQuote,
  type BillingOperation,
  type CheckoutLink,
  type MaterialTerms,
  type UpgradeChoice,
  type UsageMeter,
} from './plan-model'

const HOME = '/club/settings'

function Icon({ name }: { name: 'back' | 'warning' | 'error' | 'info' }) {
  if (name === 'info') return <ClockIcon />
  const icon = venueIcons[name]
  return <SvgXml xml={icon.xml} width={icon.width} height={icon.height} />
}

function ClockIcon() {
  return <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm0 1.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm.75 2.25v3.44l2.2 1.32a.75.75 0 1 1-.78 1.28l-2.56-1.54A.75.75 0 0 1 9.25 10V6.25a.75.75 0 0 1 1.5 0Z" fill="#3676E0" />
  </Svg>
}

function Banner({ tone, title, body }: { tone: 'info' | 'warning' | 'neutral' | 'error' | 'success'; title: string; body: string }) {
  const palette = tone === 'error' ? ['#fdecec', '#fac5c5'] : tone === 'warning' ? ['#fef5e7', '#fce1b3'] : tone === 'info' || tone === 'success' ? ['#ebf3fe', '#c2d8fc'] : ['#fefefe', '#e7e7e8']
  const icon = tone === 'error' ? 'error' : tone === 'warning' ? 'warning' : 'info'
  return <View accessibilityRole={tone === 'error' ? 'alert' : undefined} style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, backgroundColor: palette[0], borderColor: palette[1] }}>
    <Icon name={icon} />
    <View style={{ flex: 1, gap: 2 }}>
      <Text className="font-inter-600" style={{ fontSize: 14, lineHeight: 20, color: '#120f18' }}>{title}</Text>
      <Text className="font-sans" style={{ fontSize: 12, lineHeight: 16, color: '#605e64' }}>{body}</Text>
    </View>
  </View>
}

function Meter({ meter }: { meter: UsageMeter }) {
  if (meter.state === 'ABSENT') return null
  return <View style={{ backgroundColor: '#fefefe', borderRadius: 12, padding: 12, gap: 4 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text className="font-inter-600" style={{ flex: 1, fontSize: 14, lineHeight: 20, color: '#120f18' }}>{meterLabel(meter.key)}</Text>
      <Text className="font-inter-600" style={{ fontSize: 14, lineHeight: 20, color: '#120f18', textAlign: 'right' }}>{meterValue(meter)}</Text>
    </View>
    <Text className="font-sans" style={{ fontSize: 12, lineHeight: 16, color: '#605e64' }}>{meterCaption(meter)}</Text>
  </View>
}

function failureCopy(kind: string | null): string {
  if (kind === 'timeout') return 'La consulta tardó demasiado. Podés volver a consultar sin iniciar otro pago.'
  if (kind === 'network') return 'No pudimos conectar con el servidor. Reintentá la consulta.'
  if (kind === 'not-found') return 'No encontramos la información de este club.'
  return 'No pudimos leer la respuesta. Reintentá la consulta.'
}

export function ClubPlanScreen() {
  const { user, destination, phase } = useAuth()
  const context = destination?.kind === 'club' ? user?.accessContexts?.find(item => item.activity === 'CLUB' && item.clubId === destination.clubId) : null
  const permissions = context?.permissions ?? []
  const canView = (phase === 'ready' || (phase === 'checking' && Boolean(user))) && permissions.includes('VIEW_BILLING')
  const canManage = canView && permissions.includes('MANAGE_SUBSCRIPTION')
  const canEvents = canView && permissions.includes('MANAGE_TOURNAMENTS')
  const plan = useClubPlan(context?.clubId ?? null, user?.userId ?? null, canEvents, canView)
  const refresh = useRefreshControl(async () => { await plan.refresh() })
  const [step, setStep] = useState<PlanStep>({ name: 'closed' })
  const [busy, setBusy] = useState(false)
  const [awaitingReturn, setAwaitingReturn] = useState(false)
  const [selector, setSelector] = useState(false)
  const consented = useRef<MaterialTerms | null>(null)
  const pendingLink = useRef<CheckoutLink | null>(null)
  const actionLock = useRef(false)
  const journeyEpoch = useRef(0)
  const authorizedUrl = useRef<string | null>(null)
  const clubId = destination?.kind === 'club' ? destination.clubId : null
  const contextKey = `${user?.userId ?? ''}|${clubId ?? ''}|${canView}|${canManage}`
  const contextKeyRef = useRef(contextKey)
  const live = useRef({ clubId, userId: user?.userId ?? null })
  live.current = { clubId, userId: user?.userId ?? null }
  const firstContext = useRef(true)
  useEffect(() => {
    if (firstContext.current) {
      firstContext.current = false
      contextKeyRef.current = contextKey
      return
    }
    journeyEpoch.current += 1
    contextKeyRef.current = contextKey
    pendingLink.current = null
    consented.current = null
    authorizedUrl.current = null
    actionLock.current = false
    setStep({ name: 'closed' })
    setBusy(false)
    setAwaitingReturn(false)
    setSelector(false)
  }, [contextKey])
  useEffect(() => () => { journeyEpoch.current += 1 }, [])
  const capture = () => ({ epoch: journeyEpoch.current, key: contextKeyRef.current, clubId: live.current.clubId, userId: live.current.userId })
  const active = (token: ReturnType<typeof capture>) => token.epoch === journeyEpoch.current && token.key === contextKeyRef.current && token.clubId === live.current.clubId && token.userId === live.current.userId
  const refreshPlan = useRef(plan.refresh)
  refreshPlan.current = plan.refresh
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') void refreshPlan.current()
    })
    return () => subscription.remove()
  }, [])
  const insets = useSafeAreaInsets()
  const back = useCallback(() => { if (router.canGoBack()) router.back(); else router.replace(HOME as Href) }, [])
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step.name !== 'closed') {
        if (!busy) setStep({ name: 'closed' })
        return true
      }
      if (selector) {
        setSelector(false)
        return true
      }
      back()
      return true
    })
    return () => subscription.remove()
  }, [back, busy, selector, step.name])

  const fail = async (error: unknown, title: string, operation: BillingOperation, token: ReturnType<typeof capture>) => {
    if (!active(token)) return
    if (error instanceof ApiError && error.status === 401) return
    const conflict = error instanceof ApiError ? conflictOutcome(operation, error.status) : null
    if (conflict === 'reread-resume') {
      try {
        const next = await plan.reload()
        if (!active(token)) return
        if (resumeConfirmation(next.subscription) === 'resumed') {
          setStep({ name: 'message', title: 'Renovación reanudada', body: 'La consulta confirma que la renovación ya no está pendiente. No se inició otro pago.' })
        } else {
          setStep({ name: 'error', title: 'Renovación', body: 'No pudimos confirmar si la renovación quedó activa. Podés consultar de nuevo. No se repitió el envío.' })
        }
      } catch {
        if (!active(token)) return
        setStep({ name: 'error', title: 'Renovación', body: 'No pudimos volver a leer la renovación. No se repitió el envío.' })
      }
      return
    }
    if (conflict === 'recoverable') {
      void plan.reload()
      setStep({ name: 'error', title, body: 'La operación no se pudo completar. Actualizamos la consulta y no la repetimos.' })
      return
    }
    const kind = planFailure(error)
    if (kind === 'forbidden') {
      setStep({ name: 'error', title, body: 'No tenés permiso para esta operación.' })
      return
    }
    setStep({ name: 'error', title, body: failureCopy(kind) })
  }

  const openPayment = async (url: string, token: ReturnType<typeof capture>) => {
    if (!active(token) || !sameServerUrl(authorizedUrl.current, url)) {
      setStep({ name: 'error', title: 'No pudimos abrir el pago', body: 'El destino no es el enlace devuelto para este club. No se abrió el navegador.' })
      return
    }
    setAwaitingReturn(true)
    setStep({ name: 'closed' })
    try { await Linking.openURL(url) } catch {
      if (!active(token)) return
      setStep({ name: 'error', title: 'No pudimos abrir el navegador', body: 'Podés reintentar desde esta pantalla. Cerrar este aviso no cancela un cobro.' })
    }
  }

  const applyOpen = async (link: CheckoutLink, shown: MaterialTerms, token: ReturnType<typeof capture>) => {
    if (!active(token) || live.current.clubId !== link.clubId) return
    let charge = null
    let readFailed = false
    try {
      charge = await planApi.charge(link.clubId, link.reference)
    } catch {
      readFailed = true
    }
    if (!active(token) || live.current.clubId !== link.clubId) return
    const decision = decideOpen({ clubId: link.clubId, link, charge, readFailed, shown, nowMs: Date.now() })
    if (decision.kind === 'open') {
      await openPayment(link.url, token)
      return
    }
    if (decision.kind === 'mismatch' && charge) {
      const next = chargeMaterial(charge)
      consented.current = next
      pendingLink.current = link
      setStep({ name: 'terms', terms: next })
      return
    }
    if (decision.kind === 'applied') {
      await plan.reload()
      if (!active(token)) return
      setAwaitingReturn(false)
      setStep({ name: 'message', title: 'Pago confirmado', body: 'El cobro ya está confirmado. No se abrió otro pago.' })
      return
    }
    if (decision.kind === 'expired') {
      setStep({ name: 'message', title: 'La vigencia terminó', body: decision.requote ? 'La cotización venció. Pedí una cotización nueva para ver las condiciones actuales. No se abrió el enlace vencido.' : 'El enlace ya no está vigente. No se abrió ni se inició otro cobro.' })
      return
    }
    if (decision.kind === 'unavailable') {
      setStep({ name: 'error', title: 'Pago', body: 'No pudimos leer las condiciones del cobro. No se abrió el navegador.' })
      return
    }
    const banner = charge ? chargeBanner(charge) : null
    setStep({ name: 'message', title: banner?.title ?? 'Cobro', body: banner?.body ?? 'Consultá el estado en el panel. No se abrió otro pago.' })
  }

  const followLink = async (link: CheckoutLink, shown: MaterialTerms, token: ReturnType<typeof capture>) => {
    if (!active(token) || live.current.clubId !== link.clubId || !live.current.userId) {
      setStep({ name: 'error', title: 'Pago', body: 'La respuesta no corresponde a este club.' })
      return
    }
    authorizedUrl.current = link.url
    pendingLink.current = link
    await plan.rememberCharge(link.reference)
    if (!active(token)) return
    await applyOpen(link, shown, token)
  }

  const guarded = async (operation: () => Promise<void>) => {
    if (actionLock.current) return
    actionLock.current = true
    setBusy(true)
    try { await operation() } finally { actionLock.current = false; setBusy(false) }
  }

  const startChoice = () => void guarded(async () => {
    const token = capture()
    if (!plan.subscription || !canManage || !live.current.clubId) return
    setStep({ name: 'loading', title: 'Planes' })
    try {
      const offers = await planApi.plans()
      if (!active(token)) return
      setStep({ name: 'choose', choices: upgradeChoices(plan.subscription, offers), offers })
    } catch (error) { await fail(error, 'Planes', 'plans', token) }
  })

  const quoteStart = async (token: ReturnType<typeof capture>) => {
    if (!live.current.clubId) return
    setStep({ name: 'loading', title: 'Ajuste a ELITE' })
    try {
      const quote = await planApi.quote(live.current.clubId)
      if (!active(token)) return
      if (!quote.available) {
        setStep({ name: 'message', title: 'Ajuste a ELITE', body: 'Ahora no hay una cotización disponible. Podés volver a pedirla.' })
        return
      }
      consented.current = quoteMaterial(quote)
      setStep({ name: 'quote', quote })
    } catch (error) { await fail(error, 'Ajuste a ELITE', 'quote', token) }
  }

  const pick = (choice: UpgradeChoice) => {
    const token = capture()
    if (choice.kind === 'checkout') {
      if (!choice.amount || !choice.currency) return
      consented.current = catalogMaterial(choice.planCode, choice.amount, choice.currency)
      setStep({ name: 'confirm-checkout', choice })
      return
    }
    void guarded(() => quoteStart(token))
  }

  const confirmCheckout = () => void guarded(async () => {
    const token = capture()
    if (!live.current.clubId || step.name !== 'confirm-checkout' || !consented.current) return
    const shown = consented.current
    try {
      const link = await planApi.checkout(live.current.clubId, step.choice.planCode)
      if (!active(token)) return
      await followLink(link, shown, token)
    } catch (error) { await fail(error, 'Abrir pago', 'checkout', token) }
  })

  const confirmQuote = (quote: AdjustmentQuote) => void guarded(async () => {
    const token = capture()
    if (!live.current.clubId) return
    try {
      const link = await planApi.adjustmentCheckout(live.current.clubId)
      if (!active(token)) return
      await followLink(link, quoteMaterial(quote), token)
    } catch (error) { await fail(error, 'Ajuste a ELITE', 'quote', token) }
  })

  const confirmTerms = () => void guarded(async () => {
    const token = capture()
    const link = pendingLink.current
    const shown = consented.current
    if (!link || !shown) return
    await applyOpen(link, shown, token)
  })

  const complete = () => void guarded(async () => {
    const token = capture()
    if (!plan.subscription || !canManage) return
    if (completeChoice(plan.subscription, []).kind === 'adjustment') {
      await quoteStart(token)
      return
    }
    try {
      const offers = await planApi.plans()
      if (!active(token) || !plan.subscription) return
      const choice = completeChoice(plan.subscription, offers)
      if (choice.kind === 'adjustment') {
        await quoteStart(token)
        return
      }
      if (choice.kind === 'unavailable') {
        setStep({ name: 'message', title: 'Completar pago', body: 'Este plan no tiene un precio mensual publicado. No se abre el pago.' })
        return
      }
      consented.current = catalogMaterial(choice.choice.planCode, choice.choice.amount, choice.choice.currency)
      setStep({ name: 'confirm-checkout', choice: choice.choice })
    } catch (error) { await fail(error, 'Completar pago', 'plans', token) }
  })

  const startResume = () => void guarded(async () => {
    const token = capture()
    if (!live.current.clubId) return
    setStep({ name: 'loading', title: 'Reanudar renovación' })
    try {
      const preview = await planApi.resumePreview(live.current.clubId)
      if (!active(token)) return
      setStep({ name: 'resume', preview })
    } catch (error) { await fail(error, 'Reanudar renovación', 'resume', token) }
  })

  const confirmResume = () => void guarded(async () => {
    const token = capture()
    if (!live.current.clubId || step.name !== 'resume') return
    try {
      const preview = await planApi.confirmResume(live.current.clubId)
      if (!active(token)) return
      const next = await plan.reload()
      if (!active(token)) return
      if (preview.resumed && !preview.payerAuthorizationUrl && resumeConfirmation(next.subscription) === 'resumed') {
        setStep({ name: 'message', title: 'Renovación reanudada', body: 'La consulta confirma la misma recurrencia. Esta acción no cobra de nuevo el período vigente.' })
        return
      }
      if (preview.payerAuthorizationUrl) {
        authorizedUrl.current = preview.payerAuthorizationUrl
        setStep({ name: 'message', title: 'Falta autorizar la renovación', body: 'Abrir el enlace no confirma el pago. Cuando vuelvas, consultá de nuevo el estado.' })
        await openPayment(preview.payerAuthorizationUrl, token)
        return
      }
      setStep({ name: 'message', title: 'Renovación', body: preview.message ?? 'Consultá de nuevo el estado. Esta acción no inició otro pago.' })
    } catch (error) { await fail(error, 'Reanudar renovación', 'resume', token) }
  })

  const authorize = () => void guarded(async () => {
    const token = capture()
    const url = plan.subscription?.recurrenceAuthorizationUrl
    if (!url) {
      setStep({ name: 'error', title: 'Autorizar renovación', body: 'No hay un enlace de autorización para abrir. Consultá de nuevo el estado.' })
      return
    }
    authorizedUrl.current = url
    await openPayment(url, token)
  })

  if (phase === 'checking' && !plan.subscription && !plan.usage) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f8f8' }}><ActivityIndicator accessibilityLabel="Validando sesión" /></View>
  }
  if (phase === 'unverified') return <SessionUnverified />
  if (phase !== 'ready' && phase !== 'checking') return <Redirect href="/login" />
  if (destination?.kind !== 'club') return <Redirect href="/events" />

  const headline = planHeadline(plan.usage, plan.subscription)
  const pending = pendingBanner(plan.subscription, plan.usage?.planCode ?? null)
  const followed = plan.charge ? chargeBanner(plan.charge) : null
  const banners = [
    ...(plan.usageError ? [{ tone: 'error' as const, title: 'No pudimos cargar el uso', body: 'No hay datos de consumo disponibles. Reintentá para consultar los límites y el uso actual.' }] : []),
    ...(followed ? [followed] : []),
    ...(pending ? [pending] : []),
    ...usageBanners(plan.usage),
  ]
  const primary = primaryAction(plan.subscription, canManage)
  const capabilities = capabilityLines(plan.usage?.plan ?? null)
  const showRetry = Boolean(plan.error || plan.usageError)
  const footerLabel = showRetry && !plan.usage ? 'Reintentar' : primary === 'complete' ? 'Completar pago' : primary === 'browse' ? 'Ver planes' : primary === 'upgrade' ? 'Mejorar plan' : null
  const onFooter = () => {
    if (showRetry && !plan.usage) { void plan.reload(); return }
    if (primary === 'complete') complete()
    else if (primary === 'upgrade' || primary === 'browse') void startChoice()
  }
  const selectedName = plan.events.find(event => event.id === plan.eventId)?.name

  return <StartupReady><SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#100e16' }}>
    <StatusBar style="light" />
    <View style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
      <View style={{ height: 56, backgroundColor: '#100e16', flexDirection: 'row', alignItems: 'center', paddingRight: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={back} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <SvgXml xml={venueIcons.back.xml} width={24} height={24} />
        </Pressable>
        <Text accessibilityRole="header" className="font-inter-700" style={{ color: '#fefefe', fontSize: 20, lineHeight: 28 }}>Plan del club</Text>
      </View>
      {!canView ? <View style={{ padding: 16 }}><Banner tone="error" title="Sin permiso" body="No tenés permiso para consultar el plan de este club." /></View> : <>
        <RefreshableScrollView refreshing={refresh.refreshing || plan.refreshing} onRefresh={refresh.onRefresh} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 16 }} alwaysBounceVertical>
          {plan.loading && !headline ? <View accessibilityLabel="Cargando plan">{[0, 1, 2, 3].map(item => <View key={item} style={{ height: 72, borderRadius: 12, backgroundColor: '#dfdfdf', marginBottom: 12 }} />)}</View> : null}
          {plan.forbidden ? <Banner tone="error" title="Sin permiso" body="No tenés permiso para consultar el plan de este club." /> : null}
          {plan.error ? <Banner tone="error" title="No pudimos cargar el plan" body={failureCopy(plan.error)} /> : null}
          {headline ? <View style={{ backgroundColor: '#fefefe', borderRadius: 12, padding: 16, gap: 8 }}>
            <Text className="font-inter-600" style={{ fontSize: 24, lineHeight: 32, color: '#120f18' }}>{headline.title}</Text>
            <Text className="font-inter-600" style={{ fontSize: 14, lineHeight: 20, color: '#120f18' }}>{headline.status}</Text>
            {headline.identity ? <Text className="font-sans" style={{ fontSize: 12, lineHeight: 16, color: '#605e64' }}>{headline.identity}</Text> : null}
            <Text className="font-sans" style={{ fontSize: 12, lineHeight: 16, color: '#605e64' }}>{headline.limitsReady ? 'Límites vigentes del club' : 'No pudimos consultar los límites vigentes.'}</Text>
          </View> : null}
          {plan.subscription?.recurrenceMessage ? <Banner tone="info" title="Renovación" body={plan.subscription.recurrenceMessage} /> : null}
          {awaitingReturn ? <Banner tone="info" title="Comprobá el pago al volver" body="Volvé a esta pantalla para consultar el estado. Cerrar el navegador no cancela el cobro." /> : null}
          {banners.map(item => <Banner key={item.title + item.body} tone={item.tone} title={item.title} body={item.body} />)}
          {plan.loading && headline && !plan.usage ? <View accessibilityLabel="Cargando el uso" style={{ gap: 12 }}>
            <Text className="font-inter-600" style={{ fontSize: 18, lineHeight: 24, color: '#120f18' }}>Uso del club y del torneo</Text>
            <Text className="font-sans" style={{ fontSize: 12, lineHeight: 16, color: '#605e64' }}>Cargando el uso...</Text>
            {[0, 1, 2].map(item => <View key={item} style={{ height: 64, borderRadius: 12, backgroundColor: '#fefefe' }} />)}
          </View> : null}
          {plan.usage ? <>
            <Text className="font-inter-600" style={{ fontSize: 18, lineHeight: 24, color: '#120f18' }}>Uso del club</Text>
            <Meter meter={{ ...plan.usage.club.activeTournaments, key: 'activeTournaments' }} />
            <Meter meter={{ ...plan.usage.club.staffUsers, key: 'staffUsers' }} />
            <Text className="font-inter-600" style={{ fontSize: 18, lineHeight: 24, color: '#120f18' }}>Uso por torneo</Text>
            {plan.eventsError ? <Banner tone="error" title="No pudimos cargar los torneos" body="Reintentá la consulta. No mostramos un torneo de ejemplo." /> : null}
            {!plan.eventsError && plan.events.length === 0 ? <Text className="font-sans" style={{ fontSize: 12, lineHeight: 16, color: '#605e64' }}>Todavía no hay torneos para consultar el uso por evento.</Text> : null}
            {plan.events.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel={`Torneo consultado: ${selectedName ?? 'Elegir torneo'}`} onPress={() => setSelector(true)} style={{ height: 44, borderRadius: 16, borderWidth: 1, borderColor: '#b6b5b7', backgroundColor: '#fefefe', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SearchFieldIcon size={24} color="#605E64" />
              <Text className="font-inter-500" style={{ fontSize: 14, lineHeight: 20, color: '#605e64' }}>{selectedName ?? 'Elegir torneo'}</Text>
            </Pressable> : null}
            {plan.usage.event ? <>
              <Meter meter={{ ...plan.usage.event.confirmedEntries, key: 'confirmedEntries' }} />
              <Meter meter={{ ...plan.usage.event.divisions, key: 'divisions' }} />
              <Text className="font-sans" style={{ fontSize: 12, lineHeight: 16, color: '#605e64' }}>La lista de espera no consume el límite de parejas del plan. El cupo de cada división se consulta en sus inscripciones.</Text>
            </> : null}
          </> : null}
          {capabilities.length > 0 && plan.usage ? <View style={{ gap: 8 }}>
            <Text className="font-inter-600" style={{ fontSize: 18, lineHeight: 24, color: '#120f18' }}>Incluido en {plan.usage.planCode}</Text>
            {capabilities.map(line => <Text key={line} className="font-inter-500" style={{ fontSize: 14, lineHeight: 20, color: '#605e64' }}>{line}</Text>)}
          </View> : null}
          {canManage ? <Text className="font-sans" style={{ fontSize: 12, lineHeight: 16, color: '#605e64' }}>El cambio se activa cuando se confirma el pago.</Text> : null}
          {canManage && plan.subscription?.recurrenceResumeAction === 'RESUME_RENEWAL' ? <Button variant="secondary" onPress={startResume} style={{ height: 48, borderRadius: 8 }}>Reanudar renovación</Button> : null}
          {canManage && plan.subscription?.recurrenceResumeAction === 'AUTHORIZE_RENEWAL' ? <Button variant="secondary" onPress={() => setStep({ name: 'authorize' })} style={{ height: 48, borderRadius: 8 }}>Autorizar renovación</Button> : null}
          {showRetry && plan.usage ? <Button onPress={() => void plan.reload()} style={{ height: 48, borderRadius: 8 }}>Reintentar</Button> : null}
        </RefreshableScrollView>
        {footerLabel ? <View style={{ padding: 16, backgroundColor: '#f8f8f8' }}>
          <Button onPress={onFooter} disabled={plan.loading || busy} style={{ height: 48, borderRadius: 8, backgroundColor: '#c9cf38' }}>{footerLabel}</Button>
        </View> : null}
      </>}
      <ClubBottomNav onDashboard={() => router.replace('/dashboard')} onClub={() => router.replace(HOME as Href)} bottomInset={insets.bottom} />
    </View>
    <PlanJourney step={step} busy={busy} onClose={() => setStep({ name: 'closed' })} onPick={pick} onConfirmCheckout={confirmCheckout} onConfirmQuote={() => { if (step.name === 'quote') confirmQuote(step.quote) }} onConfirmTerms={confirmTerms} onConfirmResume={confirmResume} onAuthorize={authorize} />
    {selector ? <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selector" onPress={() => setSelector(false)} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0006', justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: '#fefefe', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', padding: 16, gap: 8 }}>
        <Text className="font-inter-600" style={{ fontSize: 18, lineHeight: 24, color: '#120f18' }}>Elegir torneo</Text>
        {plan.events.map(event => <Pressable key={event.id} accessibilityRole="button" onPress={() => { setSelector(false); void plan.selectEvent(event.id) }} style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text className="font-sans" style={{ fontSize: 14, lineHeight: 20, color: event.id === plan.eventId ? '#120f18' : '#605e64' }}>{event.name}</Text>
        </Pressable>)}
      </View>
    </Pressable> : null}
  </SafeAreaView></StartupReady>
}
