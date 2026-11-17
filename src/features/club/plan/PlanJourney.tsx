import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { venueIcons } from '../venues/venue-icons'
import { SvgXml } from 'react-native-svg'
import {
  formatBusinessDate,
  formatPayUntil,
  type AdjustmentQuote,
  type MaterialTerms,
  type PlanOffer,
  type ResumePreview,
  type UpgradeChoice,
} from './plan-model'

export type PlanStep =
  | { name: 'closed' }
  | { name: 'loading'; title: string }
  | { name: 'choose'; choices: UpgradeChoice[]; offers: PlanOffer[] }
  | { name: 'confirm-checkout'; choice: Extract<UpgradeChoice, { kind: 'checkout' }> }
  | { name: 'quote'; quote: AdjustmentQuote }
  | { name: 'terms'; terms: MaterialTerms }
  | { name: 'resume'; preview: ResumePreview }
  | { name: 'authorize' }
  | { name: 'message'; title: string; body: string }
  | { name: 'error'; title: string; body: string }

function money(amount: string | null, currency: string | null): string {
  if (!amount) return 'Importe informado por el servidor'
  return currency ? `${amount} ${currency}` : amount
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return <Text className="font-sans" style={{ fontSize: 14, lineHeight: 20, color: '#605e64' }}>{label}: {value}</Text>
}

export function PlanJourney({
  step, busy, onClose, onPick, onConfirmCheckout, onConfirmQuote, onConfirmTerms, onConfirmResume, onAuthorize,
}: {
  step: PlanStep
  busy: boolean
  onClose: () => void
  onPick: (choice: UpgradeChoice) => void
  onConfirmCheckout: () => void
  onConfirmQuote: () => void
  onConfirmTerms: () => void
  onConfirmResume: () => void
  onAuthorize: () => void
}) {
  if (step.name === 'closed') return null
  const close = () => { if (!busy) onClose() }
  return <Modal transparent statusBarTranslucent animationType="fade" onRequestClose={close}>
    <View style={{ flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 14 }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 374, maxHeight: '90%', alignSelf: 'center', borderRadius: 16, backgroundColor: '#fefefe', overflow: 'hidden' }}>
        <View style={{ minHeight: 56, paddingLeft: 16, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: '#e7e7e8', flexDirection: 'row', alignItems: 'center' }}>
          <Text accessibilityRole="header" className="font-inter-600" style={{ flex: 1, fontSize: 14, lineHeight: 20, color: '#120f18' }}>{title(step)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" disabled={busy} onPress={close} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <SvgXml xml={venueIcons.close.xml} width={24} height={24} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>{body(step, onPick)}</ScrollView>
        <View style={{ marginHorizontal: 24, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#e7e7e8', flexDirection: 'row', gap: 12 }}>
          <Button disabled={busy} variant="secondary" onPress={close} style={{ flex: 1, height: 48, borderRadius: 8, borderWidth: 0, backgroundColor: '#e7e7e8' }}>Volver</Button>
          {action(step, busy, onConfirmCheckout, onConfirmQuote, onConfirmTerms, onConfirmResume, onAuthorize)}
        </View>
      </View>
    </View>
  </Modal>
}

function title(step: PlanStep): string {
  if (step.name === 'choose') return step.choices.length > 0 ? 'Mejorar plan' : 'Ver planes'
  if (step.name === 'confirm-checkout') return 'Abrir pago'
  if (step.name === 'quote') return 'Ajuste a ELITE'
  if (step.name === 'terms') return 'Condiciones del cobro'
  if (step.name === 'resume') return 'Reanudar renovación'
  if (step.name === 'authorize') return 'Autorizar renovación'
  if (step.name === 'loading') return step.title
  if (step.name === 'message' || step.name === 'error') return step.title
  return 'Plan del club'
}

function body(step: PlanStep, onPick: (choice: UpgradeChoice) => void) {
  if (step.name === 'loading') return <Text className="font-sans" style={copy}>Consultando al servidor…</Text>
  if (step.name === 'message' || step.name === 'error') return <Text className="font-sans" style={copy}>{step.body}</Text>
  if (step.name === 'authorize') return <Text className="font-sans" style={copy}>Vas a abrir la autorización que ya existe. Abrir el enlace no confirma el pago ni cambia el plan.</Text>
  if (step.name === 'confirm-checkout') {
    return <Text className="font-sans" style={copy}>Vas a abrir el pago de {step.choice.name} por {money(step.choice.amount, step.choice.currency)}. El plan no cambia hasta que se confirme el cobro.</Text>
  }
  if (step.name === 'quote') {
    return <View style={{ gap: 8 }}>
      <Text className="font-sans" style={copy}>La cotización fija el importe del ajuste y la renovación mensual. El catálogo no reemplaza ese importe.</Text>
      <Row label="Importe" value={money(step.quote.amount, step.quote.currency)} />
      <Row label="Fin del período" value={formatBusinessDate(step.quote.periodEnd)} />
      <Row label="Límite para pagar" value={formatPayUntil(step.quote.payUntil)} />
    </View>
  }
  if (step.name === 'terms') {
    return <View style={{ gap: 8 }}>
      <Text className="font-sans" style={copy}>Las condiciones cambiaron. Revisalas antes de abrir el pago. Confirmar acá no inicia otra cotización.</Text>
      <Row label="Importe" value={money(step.terms.amount, step.terms.currency)} />
      <Row label="Inicio" value={formatBusinessDate(step.terms.periodStart)} />
      <Row label="Fin del período" value={formatBusinessDate(step.terms.periodEnd)} />
      <Row label="Límite para pagar" value={formatPayUntil(step.terms.payUntil)} />
      <Row label="Renovación mensual" value={money(step.terms.eliteMonthlyAmount, step.terms.eliteMonthlyCurrency)} />
    </View>
  }
  if (step.name === 'resume') {
    return <View style={{ gap: 8 }}>
      {step.preview.message ? <Text className="font-sans" style={copy}>{step.preview.message}</Text> : null}
      <Row label="Importe" value={money(step.preview.amount, step.preview.currency)} />
      <Row label="Próximo cobro" value={formatBusinessDate(step.preview.nextDebitDay)} />
      <Text className="font-sans" style={copy}>{step.preview.chargesCurrentPeriod ? 'La respuesta incluye un cargo del período vigente.' : 'Esta confirmación usa la misma recurrencia y no cobra el período vigente.'}</Text>
    </View>
  }
  if (step.name === 'choose' && step.choices.length === 0) {
    return <View style={{ gap: 12 }}>
      <Text className="font-sans" style={copy}>Estos son los planes publicados. Esta consulta no cambia el plan.</Text>
      {step.offers.map(offer => <Text key={offer.code} className="font-inter-600" style={{ fontSize: 14, lineHeight: 20, color: '#120f18' }}>{offer.name}{offer.price?.status === 'AVAILABLE' && offer.price.amount ? ` · ${money(offer.price.amount, offer.price.currency)}` : ''}</Text>)}
    </View>
  }
  if (step.name === 'choose') {
    return <View style={{ gap: 12 }}>
      <Text className="font-sans" style={copy}>Elegí una opción. Seleccionarla no activa el plan.</Text>
      {step.choices.map(choice => <Pressable key={choice.kind + choice.planCode} accessibilityRole="button" onPress={() => onPick(choice)} style={{ minHeight: 56, borderWidth: 1, borderColor: '#e7e7e8', borderRadius: 12, padding: 12, gap: 4 }}>
        <Text className="font-inter-600" style={{ fontSize: 14, lineHeight: 20, color: '#120f18' }}>{choice.name}</Text>
        <Text className="font-sans" style={copy}>{choice.kind === 'adjustment' ? 'Ajuste por los días restantes del período pago' : money(choice.amount, choice.currency)}</Text>
      </Pressable>)}
    </View>
  }
  return null
}

function action(step: PlanStep, busy: boolean, onConfirmCheckout: () => void, onConfirmQuote: () => void, onConfirmTerms: () => void, onConfirmResume: () => void, onAuthorize: () => void) {
  const button = (label: string, onPress: () => void) => <Button loading={busy} disabled={busy} onPress={onPress} style={{ flex: 1, height: 48, borderRadius: 8 }}>{label}</Button>
  if (step.name === 'confirm-checkout') return button('Abrir pago', onConfirmCheckout)
  if (step.name === 'quote') return button('Confirmar cotización', onConfirmQuote)
  if (step.name === 'terms') return button('Abrir pago', onConfirmTerms)
  if (step.name === 'resume') return button('Confirmar reanudación', onConfirmResume)
  if (step.name === 'authorize') return button('Abrir autorización', onAuthorize)
  return null
}

const copy = { fontSize: 14, lineHeight: 20, color: '#605e64' }
