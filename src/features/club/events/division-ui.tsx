import { useState, type ReactNode } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { push, s as shell } from './EventShell'
import { divisionIcons } from './division-icons'
import {
  OPEN, genderLabels, gridOrder, sumRange, toggleCategory, typeLabels, validMaxPairs, validSum,
  type CatalogCategory, type DivisionType, type GenderType, type Selection,
} from './division-model'

type Tone = 'info' | 'loading' | 'error' | 'success' | 'blocked'
const tones: Record<Tone, { box: object; icon: keyof typeof divisionIcons }> = {
  info: { box: { borderColor: '#c2d8fc', backgroundColor: '#ebf3fe' }, icon: 'bannerCheck' },
  loading: { box: { borderColor: '#c2d8fc', backgroundColor: '#ebf3fe' }, icon: 'clock' },
  error: { box: { borderColor: '#fac5c5', backgroundColor: '#fdecec' }, icon: 'bannerError' },
  success: { box: { borderColor: '#baedcd', backgroundColor: '#e9f9ef' }, icon: 'bannerCheck' },
  blocked: { box: { borderColor: '#e7e7e8', backgroundColor: '#f6f6f6' }, icon: 'blocked' },
}

function Glyph({ name, size = 20 }: { name: keyof typeof divisionIcons; size?: number }) {
  return <SvgXml xml={divisionIcons[name].xml} width={size} height={size} />
}

/** «Banner estado» of the UI kit: semantic tone, icon, title and supporting text. */
export function Banner({ tone, title, children }: { tone: Tone; title: string; children?: ReactNode }) {
  return <View accessibilityRole={tone === 'error' ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[d.banner, tones[tone].box]}>
    <Glyph name={tones[tone].icon} />
    <View style={d.flex}>
      <Text className="font-inter-600" style={d.bannerTitle}>{title}</Text>
      {children ? <Text className="font-sans" style={d.bannerText}>{children}</Text> : null}
    </View>
  </View>
}

/** KAN-149 Banner Blocked plus the role action: CLUB_ADMIN «Ver plan», CLUB_STAFF explanation only. */
export function LimitBanner({ reason, admin }: { reason: { title: string; detail: string }; admin: boolean }) {
  return <View style={d.gap8}>
    <Banner tone="blocked" title={reason.title}>{reason.detail}{!admin && ' El administrador del club gestiona el cambio de plan.'}</Banner>
    {admin && <Pressable accessibilityRole="link" onPress={() => push('/club/plan')} style={d.planLink}>
      <Text className="font-inter-600" style={d.label}>Ver plan</Text>
    </Pressable>}
  </View>
}

function Legend({ children }: { children: string }) {
  return <Text accessibilityRole="header" className="font-inter-600" style={d.legend}>{children}</Text>
}

function Segmented<T extends string>({ legend, value, options, onChange }: {
  legend: string; value: T; options: [T, string][]; onChange: (value: T) => void
}) {
  return <View style={d.gap16} accessibilityRole="radiogroup" accessibilityLabel={legend}>
    <Legend>{legend}</Legend>
    <View style={d.track}>
      {options.map(([option, label]) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: value === option }}
        onPress={() => onChange(option)} style={[d.segment, value === option && d.segmentOn]}>
        <Text className={value === option ? 'font-inter-500' : 'font-inter-600'} style={d.label}>{label}</Text>
      </Pressable>)}
    </View>
  </View>
}

function Field({ label, error, children }: { label: string; error?: string | false; children: ReactNode }) {
  return <View style={d.gap8}>
    <Text className="font-inter-600" style={d.label}>{label} <Text style={{ color: '#ef4444' }}>*</Text></Text>
    {children}
    {error ? <Text accessibilityRole="alert" className="font-sans" style={d.fieldError}>{error}</Text> : null}
  </View>
}

/** Native stand-in for the KAN-77 select: a field that opens the catalog list. */
function CategorySelect({ label, value, catalog, onChange }: { label: string; value: string; catalog: CatalogCategory[]; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const chosen = catalog.find(category => category.id === value)
  return <View style={[d.flex, d.gap8]}>
    <Text className="font-inter-600" style={d.label}>{label} <Text style={{ color: '#ef4444' }}>*</Text></Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label + ': ' + (chosen?.name ?? 'Seleccionar')} onPress={() => setOpen(true)} style={[shell.field, d.select]}>
      <Text className="font-sans" style={[d.label, !chosen && { color: '#605e64' }]}>{chosen?.name ?? 'Seleccionar'}</Text>
      <Text style={d.label}>▾</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" style={shell.overlay} onPress={() => setOpen(false)}>
        <View style={shell.dialog} accessibilityViewIsModal>
          <View style={shell.dialogHeader}><Text className="font-inter-600" style={d.label}>{label}</Text></View>
          <ScrollView style={{ maxHeight: 420 }}>
            {catalog.map(category => <Pressable key={category.id} accessibilityRole="radio" accessibilityState={{ checked: category.id === value }}
              onPress={() => { onChange(category.id); setOpen(false) }} style={[d.option, category.id === value && d.segmentSoft]}>
              <Text className="font-inter-500" style={d.label}>{category.name}</Text>
            </Pressable>)}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  </View>
}

/**
 * Step 4 body (and the configuration step of the hub editor): composition, type and its parameters.
 * `single` keeps one Simple category (editing a saved or a single division).
 */
export function CriterionFields({ selection, set, catalog, single = false, onOverflow, canAdd }: {
  selection: Selection
  set: (selection: Selection) => void
  catalog: CatalogCategory[]
  single?: boolean
  canAdd: (next: number) => boolean
  onOverflow: () => void
}) {
  const range = sumRange(catalog)
  const sumInvalid = selection.sumText.trim() !== '' && !validSum(selection.sumText, catalog)
  const pick = (id: string) => {
    const next = toggleCategory(selection.categoryIds, id, single)
    if (next.length > selection.categoryIds.length && !canAdd(next.length)) {
      onOverflow()
      return
    }
    set({ ...selection, categoryIds: next })
  }
  const rows = [...gridOrder(catalog).map(category => ({ id: category.id, label: category.name })), { id: OPEN, label: 'OPEN' }]
  const genders: [GenderType, string][] = (['MALE', 'FEMALE', 'MIXED'] as const).map(value => [value, genderLabels[value]])
  const types: [DivisionType, string][] = (['SIMPLE', 'SUMA', 'COMBINADO'] as const).map(value => [value, typeLabels[value]])
  const options = gridOrder(catalog)
  return <>
    <Segmented legend="Composición" value={selection.genderType} options={genders} onChange={genderType => set({ ...selection, genderType })} />
    <Segmented legend="Tipo de división" value={selection.type} options={types} onChange={type => set({ ...selection, type })} />
    {selection.type === 'SIMPLE' && <View style={d.gap16}>
      <Legend>Categorías</Legend>
      {[0, 3, 6].map(start => <View key={start} style={d.track}>
        {rows.slice(start, start + 3).map(row => {
          const checked = selection.categoryIds.includes(row.id)
          return <Pressable key={row.id} accessibilityRole={single ? 'radio' : 'checkbox'} accessibilityState={{ checked }}
            accessibilityLabel={row.label} onPress={() => pick(row.id)} style={[d.segment, checked && d.segmentOn]}>
            <Text className={checked ? 'font-inter-500' : 'font-inter-600'} style={d.label}>{row.label}</Text>
          </Pressable>
        })}
      </View>)}
      {selection.categoryIds.includes(OPEN) && <Banner tone="info" title={genderLabels[selection.genderType] + ' OPEN'}>
        Cualquier categoría. Se mantiene la composición {genderLabels[selection.genderType]}.
      </Banner>}
      <Text className="font-sans" style={d.hint}>{single
        ? 'Elegí una categoría para esta división. Rige la política de categorías del club.'
        : selection.categoryIds.length === 0
          ? 'Seleccioná al menos una categoría para continuar.'
          : 'Cada categoría elegida crea una división independiente. Rige la política de categorías del club.'}</Text>
    </View>}
    {selection.type === 'SUMA' && <>
      <Field label="Suma de categorías" error={sumInvalid && range ? 'Ingresá un entero entre ' + range.min + ' y ' + range.max + '.' : false}>
        <Input accessibilityLabel="Suma de categorías" keyboardType="number-pad" style={[shell.field, sumInvalid && d.invalid]}
          value={selection.sumText} onChangeText={sumText => set({ ...selection, sumText })} />
      </Field>
      <Banner tone="info" title="Categoría efectiva del club">Se admite la suma exacta o una mayor dentro de la política del club. Nunca una suma menor.</Banner>
      <Text className="font-sans" style={d.hint}>{'Ejemplo · Suma 13, política +1 por jugador\n6ta + 7ma: válido\n6ta + 6ta: no válido\n7ma + 7ma y 7ma + 8va: válidos\n8va + 8va: no válido'}</Text>
    </>}
    {selection.type === 'COMBINADO' && <>
      <View style={[d.row, { gap: 16 }]}>
        <CategorySelect label="Categoría A" value={selection.first} catalog={options} onChange={first => set({ ...selection, first })} />
        <CategorySelect label="Categoría B" value={selection.second} catalog={options} onChange={second => set({ ...selection, second })} />
      </View>
      {Boolean(selection.first) !== Boolean(selection.second) && <Banner tone="error" title="Completá la combinación">Seleccioná las dos categorías para continuar.</Banner>}
      <Text className="font-sans" style={d.hint}>Se exige esta combinación concreta, usando la categoría efectiva de cada jugador en el club. El orden de la pareja no cambia la combinación.</Text>
    </>}
  </>
}

/** Step 5 body: quota and the explicit substitutes choice. `fixed` = read-only after opening (3094:33750). */
export function QuotaFields({ selection, set, touched, fixed = false, busy = false }: {
  selection: Selection; set: (selection: Selection) => void; touched: boolean; fixed?: boolean; busy?: boolean
}) {
  const invalid = touched && !validMaxPairs(selection.maxPairsText)
  const choice = selection.substitutesAllowed
  const locked = fixed || busy
  return <>
    <Field label="Máximo de parejas" error={invalid && 'Ingresá un entero mayor o igual a 1.'}>
      <Input accessibilityLabel="Máximo de parejas" keyboardType="number-pad" editable={!locked} style={[shell.field, invalid && d.invalid, locked && d.locked]}
        value={selection.maxPairsText} onChangeText={maxPairsText => set({ ...selection, maxPairsText })} />
    </Field>
    <View style={d.gap8} accessibilityRole="radiogroup" accessibilityLabel="¿Esta división admite suplentes?">
      <Legend>¿Esta división admite suplentes?</Legend>
      {([[true, 'Sí, admitir lista de espera'], [false, 'No, cerrar al completar cupo']] as const).map(([value, label]) =>
        <Pressable key={label} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: choice === value, disabled: locked }}
          disabled={locked} onPress={() => set({ ...selection, substitutesAllowed: value })}
          style={[d.substitute, choice === value && d.segmentSoft]}>
          <View style={[shell.circle, choice === value && (locked ? d.lockedCircle : shell.activeCircle)]}>
            {choice === value && <View style={[shell.dot, locked && { backgroundColor: '#c4c3c7' }]} />}
          </View>
          <Text className="font-inter-500" style={d.label}>{label}</Text>
        </Pressable>)}
    </View>
    <Text className="font-sans" style={d.muted}>{choice === null ? 'Elegí Sí o No para continuar.' : choice
      ? 'Con cupo lleno, las nuevas parejas podrán anotarse en lista de espera.'
      : 'Con cupo lleno, no se admitirán nuevas inscripciones.'}</Text>
    <Banner tone="info" title="Se define antes de abrir">La admisión de suplentes no puede cambiarse una vez abiertas las inscripciones.</Banner>
    <Text className="font-sans" style={d.hint}>Precio y cierre de inscripción se configuran una sola vez para todo el evento.</Text>
  </>
}

/** Catalog loading / error states of step 4 (3089:34298, 3089:34383). */
export function CatalogState({ pending, error, retry, genderType }: { pending: boolean; error: boolean; retry: () => void; genderType: GenderType }) {
  return <>
    <Text className="font-inter-500" style={d.muted}>Composición · {genderLabels[genderType]}</Text>
    {pending && <Banner tone="loading" title="Cargando categorías">Estamos consultando el catálogo del club.</Banner>}
    {error && <>
      <Banner tone="error" title="No pudimos cargar las categorías">Volvé a intentar. No se seleccionará una categoría por vos.</Banner>
      <Button variant="secondary" style={shell.soft} onPress={retry}>Reintentar</Button>
    </>}
  </>
}

/** «Division Card» of the KAN-77 handoff: title, quota, type and substitutes. */
export function DivisionCard({ title, maxPairs, type, substitutes, muted = false, footer }: {
  title: string; maxPairs: number; type: string; substitutes: boolean; muted?: boolean; footer?: ReactNode
}) {
  return <View style={[d.card, muted && { opacity: 0.7 }]} accessible accessibilityLabel={title + ', cupo máximo ' + maxPairs + ', tipo ' + type + ', suplentes ' + (substitutes ? 'sí' : 'no')}>
    <View style={d.cardBody}>
      <View style={[d.row, { gap: 4 }]}><Glyph name="trophy" size={24} /><Text className="font-inter-600" style={d.cardTitle}>{title}</Text></View>
      <View>
        <View style={[d.cardRow, d.cardDivider]}><Text className="font-sans" style={d.cardText}>Cupo máximo</Text><Text className="font-inter-600" style={d.label}>{maxPairs}</Text></View>
        <View style={[d.cardRow, { paddingTop: 12 }]}><Text className="font-sans" style={d.cardText}>Tipo</Text><Text className="font-sans" style={d.cardText}>{type}</Text></View>
        <View style={[d.cardRow, { paddingTop: 8 }]}><Text className="font-sans" style={d.cardText}>Suplentes</Text><Text className="font-inter-600" style={d.label}>{substitutes ? 'Sí' : 'No'}</Text></View>
      </View>
    </View>
    {footer}
  </View>
}

export function CardActions({ children }: { children: ReactNode }) {
  return <View style={d.row}>{children}</View>
}

export function CardAction({ label, onPress, disabled, aria }: { label: string; onPress: () => void; disabled?: boolean; aria?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={aria ?? label} accessibilityState={{ disabled: Boolean(disabled) }}
    disabled={disabled} onPress={onPress} style={d.cardAction}>
    <Text className="font-inter-600" style={[d.label, disabled && { color: '#929195' }]}>{label}</Text>
  </Pressable>
}

export const d = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  gap8: { gap: 8 },
  gap16: { gap: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 8, padding: 12 },
  bannerTitle: { fontSize: 14, lineHeight: 20, color: '#120f18' },
  bannerText: { fontSize: 12, lineHeight: 16, color: '#605e64' },
  planLink: { height: 48, alignItems: 'center', justifyContent: 'center' },
  legend: { fontSize: 14, lineHeight: 20, color: '#120f18' },
  label: { fontSize: 14, lineHeight: 20, color: '#120f18' },
  muted: { fontSize: 14, lineHeight: 20, color: '#605e64' },
  hint: { fontSize: 12, lineHeight: 16, color: '#605e64' },
  track: { flexDirection: 'row', gap: 8, borderRadius: 8, backgroundColor: '#f5f5f5', padding: 8 },
  segment: { flex: 1, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: '#c9cf38' },
  segmentSoft: { backgroundColor: '#f8f8e9' },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  option: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  fieldError: { fontSize: 14, lineHeight: 20, color: '#b51e15' },
  invalid: { borderColor: '#d93e3e' },
  locked: { backgroundColor: '#f5f5f5' },
  lockedCircle: { borderColor: '#c4c3c7' },
  substitute: { flexDirection: 'row', alignItems: 'center', gap: 16, height: 48, borderRadius: 8, paddingHorizontal: 16, backgroundColor: '#f5f5f5' },
  card: { borderRadius: 8, backgroundColor: '#fefefe', shadowColor: '#120f18', shadowOpacity: 0.16, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  cardBody: { gap: 12, padding: 16 },
  cardTitle: { fontSize: 16, lineHeight: 24, color: '#4a4850' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardDivider: { borderBottomWidth: 1, borderBottomColor: '#e7e7e8', paddingBottom: 8 },
  cardText: { fontSize: 14, lineHeight: 20, color: '#4a4850' },
  cardAction: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
})
