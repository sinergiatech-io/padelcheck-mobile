import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import {
  AccessibilityInfo,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  findNodeHandle,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { router, type Href } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { TrophyOutlineIcon } from '@/components/icons/TrophyIcon'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { useAuth } from '@/context/AuthContext'
import { alertErrorXml, alertWarningXml } from '@/features/auth/auth-icons'
import { useRefreshControl } from '@/hooks/use-refresh-control'
import {
  FLAGS,
  LIMITS,
  MISSING,
  OFFER_CODES,
  OFFER_CTA,
  OFFER_PURPOSE,
  PLAN_NOTES,
  flagLabel,
  focusAfterRefresh,
  limitLabel,
  offerAtOffset,
  offerCtaEnabled,
  offsetForOffer,
  priceLabel,
  priceSpoken,
  type OfferCode,
  type PricingOffer,
} from './pricing-model'
import { CheckGlyph, CloseGlyph, CrossGlyph, LimitGlyph, MenuGlyph, MissingGlyph } from './pricing-icons'
import { usePlanCatalog } from './use-plan-catalog'

const logo = require('../../../assets/auth/logo.png')

const GAP = 12
const CLUB_PLAN = '/club/plan'
const REGISTER_CLUB = '/register/club'

const infoXml = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="7.5" stroke="#605E64" stroke-width="1.5"/><path d="M10 6v4l2.5 1.5" stroke="#605E64" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const bannerBox = {
  info: 'border-[#C2D8FC] bg-[#EBF3FE]',
  error: 'border-[#FAC5C5] bg-[#FDECEC]',
  warning: 'border-[#FCE1B3] bg-[#FEF5E7]',
} as const
const bannerIcon = { info: infoXml, error: alertErrorXml, warning: alertWarningXml } as const

function Banner({ tone, title, detail }: { tone: keyof typeof bannerBox; title: string; detail: string }) {
  return (
    <View
      accessible
      accessibilityRole={tone === 'error' ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
      className={`flex-row items-center gap-[12px] rounded-[8px] border p-[12px] ${bannerBox[tone]}`}
    >
      <View className="h-[24px] w-[24px] items-center justify-center"><SvgXml xml={bannerIcon[tone]} width={20} height={20} /></View>
      <View className="min-w-0 flex-1 gap-[2px]">
        <Text className="font-inter-600 text-[14px] leading-[20px] text-[#120F18]">{title}</Text>
        <Text className="font-sans text-[12px] leading-[16px] text-[#605E64]">{detail}</Text>
      </View>
    </View>
  )
}

function PrimaryAction({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`h-[48px] items-center justify-center rounded-[8px] px-[24px] ${disabled ? 'bg-[#3A3740]' : 'bg-[#C9CF38] active:bg-[#B5BA32]'}`}
    >
      <Text className={`font-inter-500 text-[14px] leading-[21px] ${disabled ? 'text-[#929195]' : 'text-[#120F18]'}`}>{label}</Text>
    </Pressable>
  )
}

function OfferCard({ offer, width, padding, enabled }: { offer: PricingOffer; width: number; padding: number; enabled: boolean }) {
  return (
    <View style={{ width, padding }} className="rounded-[8px] border border-[#2E2B33] bg-[#1B1820]">
      <Text accessibilityRole="header" className="font-inter-700 text-[36px] leading-[40px] text-[#FAFAEB]">{offer.code}</Text>
      <Text className="mt-[8px] font-sans text-[16px] leading-[24px] text-[#E7E7E8]">{OFFER_PURPOSE[offer.code]}</Text>
      <Text accessibilityLabel={`Precio: ${priceSpoken(offer.price)}`} className="mt-[4px] font-sans text-[14px] leading-[20px] text-[#B6B5B7]">{priceLabel(offer.price)}</Text>
      <View className="mt-[20px] gap-[20px]">
        {[LIMITS.slice(0, 2), LIMITS.slice(2, 4)].map((row) => (
          <View key={row[0].key} className="flex-row gap-[12px]">
            {row.map(({ key, label }) => {
              const value = limitLabel(key, offer.limits[key])
              const missing = value === MISSING
              return (
                <View key={key} accessible accessibilityLabel={`${label}: ${value}`} className="min-w-0 flex-1">
                  <View className="h-[36px] flex-row items-center gap-[6px]">
                    {key === 'MAX_ACTIVE_TOURNAMENTS' ? <TrophyOutlineIcon size={20} color="#E7E7E8" /> : <LimitGlyph limit={key} />}
                    <Text className={missing ? 'font-inter-500 text-[16px] leading-[24px] text-[#B6B5B7]' : value.length > 3 ? 'font-inter-600 text-[20px] leading-[28px] text-[#FAFAEB]' : 'font-inter-600 text-[28px] leading-[36px] text-[#FAFAEB]'}>{value}</Text>
                  </View>
                  <Text className="mt-[4px] font-sans text-[14px] leading-[20px] text-[#E7E7E8]">{label}</Text>
                </View>
              )
            })}
          </View>
        ))}
      </View>
      <View className="my-[20px] h-px bg-[#2E2B33]" />
      <View className="gap-[20px]">
        {FLAGS.map(({ key, label }) => {
          const value = offer.flags[key]
          return (
            <View key={key} accessible accessibilityLabel={`${label}: ${flagLabel(value)}`} className="min-h-[20px] flex-row items-center justify-between gap-[12px]">
              <Text className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-[#E7E7E8]">{label}</Text>
              <View className="flex-row items-center gap-[8px]">
                {value === 'yes' ? <CheckGlyph /> : value === 'no' ? <CrossGlyph /> : <MissingGlyph />}
                <Text className={`font-inter-600 text-[14px] leading-[20px] ${value === 'absent' ? 'text-[#B6B5B7]' : 'text-[#FAFAEB]'}`}>{flagLabel(value)}</Text>
              </View>
            </View>
          )
        })}
      </View>
      <View className="mt-auto pt-[24px]">
        <PrimaryAction label={OFFER_CTA[offer.code]} disabled={!enabled} onPress={() => router.push(REGISTER_CLUB as Href)} />
      </View>
    </View>
  )
}

function SkeletonCard({ code, width, padding }: { code: OfferCode; width: number; padding: number }) {
  const bar = 'rounded-[4px] bg-[#2E2B33]'
  return (
    <View accessible accessibilityLabel={`${code}, cargando`} style={{ width, padding }} className="rounded-[8px] border border-[#2E2B33] bg-[#1B1820]">
      <Text className="font-inter-700 text-[36px] leading-[40px] text-[#FAFAEB]">{code}</Text>
      <View className={`mt-[12px] h-[16px] w-[160px] ${bar}`} />
      <View className={`mt-[8px] h-[12px] w-[96px] ${bar}`} />
      <View className="mt-[20px] gap-[20px]">
        {[LIMITS.slice(0, 2), LIMITS.slice(2, 4)].map((row) => (
          <View key={row[0].key} className="flex-row gap-[12px]">
            {row.map(({ key }) => (
              <View key={key} className="flex-1">
                <View className={`h-[28px] w-[56px] ${bar}`} />
                <View className={`mt-[8px] h-[12px] w-[96px] ${bar}`} />
              </View>
            ))}
          </View>
        ))}
      </View>
      <View className="my-[20px] h-px bg-[#2E2B33]" />
      <View className="gap-[20px]">{FLAGS.map(({ key }) => <View key={key} className={`h-[16px] ${bar}`} />)}</View>
      <View className="pt-[24px]"><PrimaryAction label={OFFER_CTA[code]} disabled /></View>
    </View>
  )
}

function PublicMenu({ open, onClose, top, margin }: { open: boolean; onClose: () => void; top: number; margin: number }) {
  const links: { label: string; href: string; current?: boolean }[] = [
    { label: 'Inicio', href: '/' },
    { label: 'Planes', href: '/pricing', current: true },
    { label: 'Iniciar sesión', href: '/login' },
  ]
  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-[#120F18]" style={{ paddingTop: top }}>
        <View className="h-[88px] flex-row items-center justify-between" style={{ paddingHorizontal: margin }}>
          <Image source={logo} accessibilityIgnoresInvertColors style={{ width: 56, height: 56 }} resizeMode="contain" accessibilityLabel="Padel Check" />
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar menú" onPress={onClose} className="-mr-[10px] h-[44px] w-[44px] items-center justify-center">
            <CloseGlyph />
          </Pressable>
        </View>
        <View className="border-t border-[#2E2B33]" style={{ marginHorizontal: margin }}>
          {links.map((link) => (
            <Pressable
              key={link.href}
              accessibilityRole="link"
              accessibilityState={{ selected: !!link.current }}
              onPress={() => {
                onClose()
                if (!link.current) router.replace(link.href as Href)
              }}
              className="min-h-[56px] flex-row items-center justify-between border-b border-[#2E2B33]"
            >
              <Text className="font-inter-500 text-[16px] leading-[24px] text-[#FAFAEB]">{link.label}</Text>
              <View className={`h-[2px] w-[16px] rounded-full ${link.current ? 'bg-[#C9CF38]' : 'bg-[#605E64]'}`} />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  )
}

/** Native plan comparison (KAN-141), same catalog rules as web /pricing, with pull-to-refresh. */
export function PricingScreen() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { phase: sessionPhase } = useAuth()
  const catalog = usePlanCatalog()
  const { refreshing, onRefresh } = useRefreshControl(catalog.refresh)
  const [focused, setFocused] = useState<OfferCode>('FREE')
  const [menuOpen, setMenuOpen] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const strip = useRef<ComponentRef<typeof ScrollView>>(null)
  const menuTrigger = useRef<ComponentRef<typeof View>>(null)
  const chosen = useRef<OfferCode | null>(null)
  const focusedRef = useRef<OfferCode>('FREE')
  focusedRef.current = focused

  const margin = width >= 768 ? 32 : 16
  const cardWidth = width < 402 ? 304 : 330
  const cardPadding = width < 402 ? 16 : 20
  const starts = useMemo(() => OFFER_CODES.map((_, index) => index * (cardWidth + GAP)), [cardWidth])
  const maxOffset = Math.max(0, margin * 2 + OFFER_CODES.length * cardWidth + (OFFER_CODES.length - 1) * GAP - width)
  const snapOffsets = useMemo(() => Array.from(new Set(starts.map((start) => offsetForOffer(starts.indexOf(start), starts, maxOffset)))), [starts, maxOffset])

  const data = catalog.phase === 'ready' && catalog.catalog && catalog.catalog.status !== 'empty' ? catalog.catalog : null
  const empty = catalog.phase === 'ready' && catalog.catalog?.status === 'empty'

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => subscription.remove()
  }, [])

  const scrollTo = useCallback((code: OfferCode, animated: boolean) => {
    const index = OFFER_CODES.indexOf(code)
    strip.current?.scrollTo({ x: offsetForOffer(index, starts, maxOffset), y: 0, animated })
  }, [starts, maxOffset])

  const focusOffer = useCallback((code: OfferCode, announce: boolean) => {
    setFocused(code)
    if (announce && code !== focusedRef.current) AccessibilityInfo.announceForAccessibility(`Oferta en foco: ${code}`)
  }, [])

  // After each read keep the offer in focus while it is still published, otherwise go back to FREE.
  useEffect(() => {
    if (!data) return
    const next = focusAfterRefresh(focusedRef.current, data)
    setFocused(next)
    requestAnimationFrame(() => scrollTo(next, false))
  }, [data, scrollTo])

  const activate = (code: OfferCode) => {
    chosen.current = code
    focusOffer(code, true)
    scrollTo(code, !reduceMotion)
  }

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x
    const pick = chosen.current
    chosen.current = null
    // Explicit activation keeps the chosen segment when PRO and ELITE share the final tablet offset.
    if (pick && Math.abs(x - offsetForOffer(OFFER_CODES.indexOf(pick), starts, maxOffset)) <= 2) return
    focusOffer(OFFER_CODES[offerAtOffset(x, maxOffset, starts)], true)
  }

  const closeMenu = () => {
    setMenuOpen(false)
    setTimeout(() => {
      const node = menuTrigger.current ? findNodeHandle(menuTrigger.current) : null
      if (node) AccessibilityInfo.setAccessibilityFocus(node)
    }, 300)
  }

  const changePlan = () => {
    if (sessionPhase === 'ready') router.push(CLUB_PLAN as Href)
    else router.push({ pathname: '/login', params: { returnUrl: CLUB_PLAN } } as unknown as Href)
  }

  const showStrip = catalog.phase === 'loading' || !!data

  return (
    <View className="flex-1 bg-[#120F18]">
      <StatusBar style="light" />
      <RefreshableScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        alwaysBounceVertical
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}
      >
        <View className="h-[88px] flex-row items-center justify-between" style={{ paddingHorizontal: margin }}>
          <Pressable accessibilityRole="link" accessibilityLabel="Padel Check, inicio" onPress={() => router.replace('/' as Href)}>
            <Image source={logo} accessibilityIgnoresInvertColors style={{ width: 56, height: 56 }} resizeMode="contain" />
          </Pressable>
          <View className="flex-row items-center gap-[8px]">
            <Pressable accessibilityRole="link" onPress={() => router.push('/login' as Href)} className="h-[44px] justify-center px-[8px]">
              <Text className="font-inter-500 text-[14px] leading-[20px] text-[#FAFAEB]">Iniciar sesión</Text>
            </Pressable>
            <Pressable
              ref={menuTrigger}
              accessibilityRole="button"
              accessibilityLabel="Abrir menú"
              accessibilityState={{ expanded: menuOpen }}
              onPress={() => setMenuOpen(true)}
              className="-mr-[10px] h-[44px] w-[44px] items-center justify-center"
            >
              <MenuGlyph />
            </Pressable>
          </View>
        </View>

        <View style={{ paddingHorizontal: margin }}>
          <View className="h-px bg-[#2E2B33]"><View className="absolute left-0 top-[-1px] h-[3px] w-[32px] rounded-full bg-[#C9CF38]" /></View>
          <Text accessibilityRole="header" className="mt-[24px] font-inter-600 text-[32px] leading-[40px] text-[#FAFAEB]">Compará los planes para tu club</Text>
          <Text className="mt-[8px] font-sans text-[16px] leading-[24px] text-[#B6B5B7]">Empezá gratis y elegí el plan que acompañe la actividad de tu club.</Text>

          <View className="mt-[20px] gap-[12px]">
            {catalog.phase === 'loading' && <Banner tone="info" title="Cargando planes" detail="Estamos consultando los planes disponibles." />}
            {catalog.phase === 'error' && <Banner tone="error" title="No pudimos cargar los planes" detail="Revisá tu conexión e intentá nuevamente." />}
            {empty && <Banner tone="warning" title="No hay planes disponibles" detail="Por el momento no hay planes para mostrar. Intentá nuevamente más tarde." />}
            {data?.status === 'incomplete' && <Banner tone="warning" title="Información incompleta" detail="Algunos datos no están disponibles. Las ofertas sin datos no se pueden elegir por ahora." />}
            {catalog.refreshFailed && <Banner tone="error" title="No pudimos actualizar los planes" detail="Mostramos la última información disponible. Revisá tu conexión e intentá nuevamente." />}
            {(catalog.phase === 'error' || empty || data?.status === 'incomplete' || catalog.refreshFailed) && (
              <PrimaryAction
                label="Reintentar"
                disabled={refreshing}
                onPress={data ? () => void onRefresh() : catalog.retry}
              />
            )}
          </View>

          {showStrip && (
            <View accessibilityLabel="Ofertas de planes" className="mt-[20px] flex-row rounded-[8px] border border-[#3A3740] p-[2px]">
              {OFFER_CODES.map((code) => {
                const active = !!data && focused === code
                return (
                  <Pressable
                    key={code}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver oferta ${code}`}
                    accessibilityState={{ selected: active, disabled: !data }}
                    disabled={!data}
                    onPress={() => activate(code)}
                    className={`h-[44px] flex-1 items-center justify-center rounded-[6px] ${active ? 'bg-[#3A3740]' : ''}`}
                  >
                    <Text className={`font-inter-500 text-[14px] leading-[20px] ${!data ? 'text-[#605E64]' : active ? 'text-[#FAFAEB]' : 'text-[#B6B5B7]'}`}>{code}</Text>
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>

        {showStrip && (
          <ScrollView
            ref={strip}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToOffsets={snapOffsets}
            snapToEnd={false}
            decelerationRate="fast"
            disableIntervalMomentum
            scrollEnabled={!!data}
            onMomentumScrollEnd={onScrollEnd}
            onScrollEndDrag={(event) => { if (!event.nativeEvent.velocity?.x) onScrollEnd(event) }}
            className="mt-[12px]"
            contentContainerStyle={{ paddingHorizontal: margin, gap: GAP, alignItems: 'stretch' }}
          >
            {data
              ? data.offers.map((offer) => (
                <View
                  key={offer.code}
                  importantForAccessibility={focused === offer.code ? 'auto' : 'no-hide-descendants'}
                  accessibilityElementsHidden={focused !== offer.code}
                >
                  <OfferCard offer={offer} width={cardWidth} padding={cardPadding} enabled={offerCtaEnabled(data, offer.code)} />
                </View>
              ))
              : OFFER_CODES.map((code) => <SkeletonCard key={code} code={code} width={cardWidth} padding={cardPadding} />)}
          </ScrollView>
        )}

        <View style={{ paddingHorizontal: margin }}>
          <View className="mt-[40px] h-px bg-[#2E2B33]" />
          <Text accessibilityRole="header" className="mt-[24px] font-inter-600 text-[18px] leading-[28px] text-[#FAFAEB]">Sobre los planes</Text>
          <View className="mt-[12px] gap-[16px]">
            {PLAN_NOTES.map((note) => <Text key={note} className="font-sans text-[15px] leading-[24px] text-[#B6B5B7]">{note}</Text>)}
          </View>
          <View className="mt-[24px] h-px bg-[#2E2B33]" />
          <View className="mt-[16px] flex-row items-center justify-center">
            <Text className="font-sans text-[14px] leading-[20px] text-[#FAFAEB]">¿Ya tenés un club? </Text>
            <Pressable accessibilityRole="link" accessibilityLabel="Cambiar plan" onPress={changePlan} className="h-[44px] justify-center">
              <Text className="font-inter-500 text-[14px] leading-[20px] text-[#FAFAEB]">Cambiar plan</Text>
            </Pressable>
          </View>

          <View className="mt-[64px]">
            <Pressable accessibilityRole="link" accessibilityLabel="Padel Check, inicio" onPress={() => router.replace('/' as Href)} className="self-start">
              <Image source={logo} accessibilityIgnoresInvertColors style={{ width: 48, height: 48 }} resizeMode="contain" />
            </Pressable>
            <View className="mt-[32px] gap-[4px]">
              {[{ label: 'Inicio', href: '/' }, { label: 'Planes', href: null }, { label: 'Iniciar sesión', href: '/login' }].map((link) => (
                <Pressable
                  key={link.label}
                  accessibilityRole="link"
                  onPress={() => { if (link.href) router.push(link.href as Href) }}
                  className="min-h-[36px] flex-row items-center justify-between"
                >
                  <Text className="font-inter-500 text-[14px] leading-[20px] text-[#FAFAEB]">{link.label}</Text>
                  <View className="h-[2px] w-[16px] rounded-full bg-[#C9CF38]" />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </RefreshableScrollView>
      <PublicMenu open={menuOpen} onClose={closeMenu} top={insets.top} margin={margin} />
    </View>
  )
}
