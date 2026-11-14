import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'
import { catalogMatch, type Locality, type Province } from '../venues/venues-model'

type Status = 'idle' | 'loading' | 'ready' | 'error'

/** Searchable province/locality selectors — same KAN-111 pattern as venues (search + pagination + abort). */
export function ClubGeoFields({
  provinceId, provinceName, localityId, localityName, legacyLabel, disabled, errors, onProvince, onLocality,
}: {
  provinceId: string | null
  provinceName: string | null
  localityId: string | null
  localityName: string | null
  legacyLabel?: string | null
  disabled?: boolean
  errors?: { province?: string; locality?: string }
  onProvince: (province: Province | null) => void
  onLocality: (locality: Locality | null) => void
}) {
  const [selector, setSelector] = useState<'province' | 'locality' | null>(null)
  const [provinces, setProvinces] = useState<Province[]>([])
  const [localities, setLocalities] = useState<Locality[]>([])
  const [provinceStatus, setProvinceStatus] = useState<Status>('idle')
  const [localityStatus, setLocalityStatus] = useState<Status>('idle')
  const [provinceQuery, setProvinceQuery] = useState('')
  const [localityQuery, setLocalityQuery] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const flights = useRef(new Map<string, AbortController>())

  const begin = (key: string) => {
    flights.current.get(key)?.abort()
    const c = new AbortController()
    flights.current.set(key, c)
    return c
  }

  const loadProvinces = async () => {
    const c = begin('provinces')
    setProvinceStatus('loading')
    try {
      const result = await apiClient.get<{ items: Province[] }>('/locations/provinces?countryCode=AR', {
        signal: c.signal, timeoutMs: 15000,
      })
      if (flights.current.get('provinces') !== c) return
      setProvinces(result.items ?? [])
      setProvinceStatus('ready')
    } catch {
      if (flights.current.get('provinces') === c) setProvinceStatus('error')
    }
  }

  const loadLocalities = async (query = localityQuery, append = false) => {
    if (!provinceId) return
    const nextPage = append ? page + 1 : 0
    const c = begin('localities')
    setLocalityStatus('loading')
    setLocalityQuery(query)
    try {
      const result = await apiClient.get<{ items: Locality[]; total: number }>(
        `/locations/localities?countryCode=AR&provinceId=${encodeURIComponent(provinceId)}&q=${encodeURIComponent(query)}&page=${nextPage}&size=50`,
        { signal: c.signal, timeoutMs: 20000 })
      if (flights.current.get('localities') !== c) return
      const items = (result.items ?? []).map(item => ({ ...item, provinceId }))
      setLocalities(append ? current => [...current, ...items] : items)
      setTotal(result.total ?? items.length)
      setPage(nextPage)
      setLocalityStatus('ready')
    } catch {
      if (flights.current.get('localities') === c) setLocalityStatus('error')
    }
  }

  useEffect(() => {
    void loadProvinces()
    return () => { flights.current.forEach(c => c.abort()); flights.current.clear() }
  }, [])

  useEffect(() => {
    if (provinceId) void loadLocalities(localityName ?? '', false)
    else { setLocalities([]); setTotal(0); setPage(0) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload localities when province changes
  }, [provinceId])

  const filteredProvinces = useMemo(
    () => provinces.filter(p => catalogMatch(p.name, provinceQuery)),
    [provinces, provinceQuery])

  return (
    <View style={{ gap: 12 }}>
      {legacyLabel ? (
        <Text style={s.legacy}>Conservamos la ubicación anterior sin asociar: {legacyLabel}</Text>
      ) : null}
      <Field label="País">
        <TextInput value="Argentina" editable={false} style={[s.input, { backgroundColor: '#f7f7f7', color: '#605e64' }]} />
      </Field>
      <Field label="Provincia / jurisdicción *" error={errors?.province}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Provincia: ${provinceName ?? 'Seleccionar provincia'}`}
          disabled={disabled}
          onPress={() => { setProvinceQuery(''); setSelector('province'); if (provinceStatus !== 'ready') void loadProvinces() }}
          style={[s.input, s.row]}
        >
          <Text style={[s.label, !provinceName && s.gray]}>{provinceName ?? 'Seleccionar provincia'}</Text>
          <Text>›</Text>
        </Pressable>
      </Field>
      <Field label="Ciudad / localidad *" error={errors?.locality}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Localidad: ${localityName ?? 'Seleccionar localidad'}`}
          disabled={disabled || !provinceId}
          onPress={() => { setLocalityQuery(''); setSelector('locality'); void loadLocalities('', false) }}
          style={[s.input, s.row, { opacity: provinceId ? 1 : 0.5 }]}
        >
          <Text style={[s.label, !localityName && s.gray]}>{localityName ?? 'Seleccionar localidad'}</Text>
          <Text>›</Text>
        </Pressable>
      </Field>

      <Modal visible={selector !== null} onRequestClose={() => setSelector(null)} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#f5f5f5', paddingTop: 48 }}>
          <View style={[s.row, { padding: 16, gap: 12 }]}>
            <Text style={[s.heading, { flex: 1 }]}>{selector === 'province' ? 'Seleccionar provincia' : 'Seleccionar localidad'}</Text>
            <Button variant="ghost" onPress={() => setSelector(null)}>Cerrar</Button>
          </View>
          <View style={{ paddingHorizontal: 16 }}>
            <TextInput
              accessibilityLabel={selector === 'province' ? 'Buscar provincia' : 'Buscar localidad'}
              placeholder="Buscar"
              value={selector === 'province' ? provinceQuery : localityQuery}
              onChangeText={value => {
                if (selector === 'province') setProvinceQuery(value)
                else void loadLocalities(value, false)
              }}
              style={s.input}
              editable={!disabled}
            />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 4 }}>
            {(selector === 'province' ? provinceStatus : localityStatus) === 'loading' && <ActivityIndicator accessibilityLabel="Cargando opciones" />}
            {(selector === 'province' ? provinceStatus : localityStatus) === 'error' && (
              <>
                <Text style={{ color: '#aa3030' }}>No pudimos cargar el catálogo.</Text>
                <Button onPress={() => void (selector === 'province' ? loadProvinces() : loadLocalities())}>Reintentar</Button>
              </>
            )}
            {(selector === 'province' ? filteredProvinces : localities).map(item => (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: item.id === (selector === 'province' ? provinceId : localityId) }}
                disabled={disabled}
                onPress={() => {
                  if (selector === 'province') {
                    onProvince(item as Province)
                    onLocality(null)
                  } else {
                    onLocality(item as Locality)
                  }
                  setSelector(null)
                }}
                style={s.option}
              >
                <Text style={s.label}>{item.name}</Text>
              </Pressable>
            ))}
            {selector === 'province' && provinceStatus === 'ready' && filteredProvinces.length === 0 && (
              <Text style={s.label}>No encontramos provincias con esa búsqueda.</Text>
            )}
            {selector === 'locality' && localityStatus === 'ready' && localities.length === 0 && (
              <Text style={s.label}>No encontramos localidades con esa búsqueda.</Text>
            )}
            {selector === 'locality' && localities.length < total && localityStatus === 'ready' && (
              <Button onPress={() => void loadLocalities(localityQuery, true)}>Cargar más localidades</Button>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: '500' }}>{label}</Text>
      {children}
      {error ? <Text style={{ color: '#aa3030' }}>{error}</Text> : null}
    </View>
  )
}

const s = StyleSheet.create({
  input: { borderWidth: 1, borderColor: '#929195', borderRadius: 8, paddingHorizontal: 16, minHeight: 56, backgroundColor: '#fefefe', color: '#120f18', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 14, color: '#120f18' },
  gray: { color: '#605e64' },
  heading: { fontSize: 18, fontWeight: '600' },
  option: { minHeight: 48, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e7e7e8' },
  legacy: { backgroundColor: '#fff8e1', padding: 12, borderRadius: 8 },
})
