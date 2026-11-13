import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { Redirect, router, usePreventRemove, type Href } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { StartupReady } from '@/features/startup/StartupReady'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { WEEKDAYS, daySummary, type Weekday } from './club-profile-model'
import { useSportSettings } from './use-sport-settings'

const HOME = '/club/settings'
const field = { borderWidth: 1, borderColor: '#929195', borderRadius: 8, paddingHorizontal: 16, minHeight: 56, backgroundColor: '#fefefe', color: '#120f18' } as const

function useClubAccess() {
  const { user, destination, phase } = useAuth()
  const context = destination?.kind === 'club' ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  return { phase, destination, allowed: phase === 'ready' && Boolean(context?.permissions?.includes('MANAGE_CLUB_SETTINGS')), clubId: context?.clubId ?? null }
}

export function ClubSportSettingsScreen() {
  const access = useClubAccess()
  const insets = useSafeAreaInsets()
  const settings = useSportSettings(access.allowed ? access.clubId : null)
  const [discard, setDiscard] = useState(false)
  usePreventRemove((settings.dirty || settings.saving || !!settings.dayDraft) && !discard, () => setDiscard(true))

  if (access.phase === 'checking') return <View style={s.center}><ActivityIndicator /></View>
  if (access.phase === 'unverified') return <SessionUnverified />
  if (access.phase !== 'ready') return <Redirect href="/login" />
  if (access.destination?.kind !== 'club') return <Redirect href="/events" />

  if (settings.dayDraft) {
    const day = settings.dayDraft
    const label = WEEKDAYS.find(([key]) => key === day.day)?.[1] ?? day.day
    const open = day.value.status === 'OPEN'
    return (
      <StartupReady>
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#100e16' }}>
          <StatusBar style="light" />
          <View style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
            <View style={s.header}>
              <Pressable onPress={() => settings.setDayDraft(null)} style={s.iconBtn}><Text style={{ color: '#fff', fontSize: 22 }}>←</Text></Pressable>
              <Text style={s.title}>Horario del {label.toLowerCase()}</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              <View style={s.card}>
                <Text style={{ fontWeight: '500' }}>Abierto</Text>
                <Switch value={open} onValueChange={checked => settings.setDayDraft({
                  day: day.day,
                  value: checked ? { status: 'OPEN', intervals: day.value.intervals } : { status: 'CLOSED', intervals: [] },
                })} />
              </View>
              {open && day.value.intervals.map((interval, index) => (
                <View key={index} style={[s.card, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text>Franja {index + 1}</Text>
                    <Pressable onPress={() => settings.setDayDraft({
                      day: day.day,
                      value: { ...day.value, intervals: day.value.intervals.filter((_, i) => i !== index) },
                    })}><Text style={{ color: '#d93e3e' }}>Quitar</Text></Pressable>
                  </View>
                  <TextInput value={interval.open} placeholder="HH:mm apertura" style={field} onChangeText={openTime => {
                    const intervals = day.value.intervals.map((item, i) => i === index ? { ...item, open: openTime } : item)
                    settings.setDayDraft({ day: day.day, value: { ...day.value, intervals } })
                  }} />
                  <TextInput value={interval.close} placeholder="HH:mm cierre" style={field} onChangeText={close => {
                    const intervals = day.value.intervals.map((item, i) => i === index ? { ...item, close } : item)
                    settings.setDayDraft({ day: day.day, value: { ...day.value, intervals } })
                  }} />
                </View>
              ))}
              {open && <Button onPress={() => settings.setDayDraft({
                day: day.day,
                value: { ...day.value, intervals: [...day.value.intervals, { open: '', close: '' }] },
              })}>Agregar franja</Button>}
              {settings.errors.day && <Text style={{ color: '#aa3030' }}>{settings.errors.day}</Text>}
            </ScrollView>
            <View style={{ padding: 16 }}><Button onPress={() => settings.applyDay()}>Aplicar horario</Button></View>
          </View>
        </SafeAreaView>
      </StartupReady>
    )
  }

  return (
    <StartupReady>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#100e16' }}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
          <View style={s.header}>
            <Pressable disabled={settings.saving} onPress={() => {
              if (settings.dirty) setDiscard(true)
              else router.replace(HOME as Href)
            }} style={s.iconBtn}><Text style={{ color: '#fff', fontSize: 22 }}>←</Text></Pressable>
            <Text style={s.title}>Configuración de torneos</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            {!access.allowed ? <Text>No tenés permiso para gestionar la configuración de este club.</Text>
              : settings.loading ? <Text>Cargando configuración…</Text>
                : settings.loadError ? <View style={{ gap: 12 }}><Text>No pudimos cargar la configuración.</Text><Button onPress={() => void settings.reload()}>Reintentar</Button></View>
                  : <>
                    {settings.result && <Text style={{ color: settings.result === 'error' ? '#aa3030' : '#078332' }}>{settings.result === 'success' ? 'Cambios guardados' : 'No pudimos guardar'}</Text>}
                    <Text style={s.section}>Defaults de partidos</Text>
                    <Text>Duración estimada (min)</Text>
                    <TextInput keyboardType="number-pad" style={field} value={String(settings.draft.defaultMatchDurationMinutes)}
                      onChangeText={v => settings.patch({ defaultMatchDurationMinutes: Number(v) || 0 })} editable={!settings.saving} />
                    {settings.errors.duration && <Text style={{ color: '#aa3030' }}>{settings.errors.duration}</Text>}
                    <Text>Descanso mínimo (min)</Text>
                    <TextInput keyboardType="number-pad" style={field} value={String(settings.draft.defaultRestMinutes)}
                      onChangeText={v => settings.patch({ defaultRestMinutes: Number(v) || 0 })} editable={!settings.saving} />
                    {settings.errors.rest && <Text style={{ color: '#aa3030' }}>{settings.errors.rest}</Text>}
                    <Text style={s.help}>0 es válido. Sin efecto retroactivo en calendarios existentes.</Text>
                    <Text style={s.section}>Horario semanal del club</Text>
                    {settings.draft.partialWeek && <Text style={s.help}>Semana parcial: hay días sin configurar.</Text>}
                    {WEEKDAYS.map(([key, label]) => (
                      <Pressable key={key} disabled={settings.saving} onPress={() => settings.openDay(key as Weekday)} style={s.row}>
                        <Text style={{ fontWeight: '500' }}>{label}</Text>
                        <Text style={{ color: '#605e64' }}>{daySummary(settings.draft.weeklySchedule[key])}</Text>
                      </Pressable>
                    ))}
                  </>}
          </ScrollView>
          {access.allowed && !settings.loading && !settings.loadError && (
            <View style={{ padding: 16 }}>
              <Text style={[s.help, { textAlign: 'center', marginBottom: 8 }]}>{settings.dirty ? 'Tenés cambios sin guardar' : 'Sin cambios pendientes'}</Text>
              <Button loading={settings.saving} loadingLabel="Guardando…" disabled={!settings.dirty} onPress={() => void settings.save()}>Guardar cambios</Button>
            </View>
          )}
          <ClubBottomNav onDashboard={() => router.replace('/dashboard')} onClub={() => router.replace(HOME as Href)} busy={settings.saving} bottomInset={insets.bottom} />
          {discard && (
            <View style={s.overlay}>
              <View style={s.dialog}>
                <Text style={{ fontSize: 18, fontWeight: '600' }}>¿Descartar cambios de la semana?</Text>
                <Button variant="secondary" onPress={() => setDiscard(false)}>Seguir editando</Button>
                <Button onPress={() => { settings.discard(); setDiscard(false); router.replace(HOME as Href) }}>Descartar cambios</Button>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </StartupReady>
  )
}

const s = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#100e16' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  help: { fontSize: 12, color: '#605e64' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: '#0006', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: '#fff', borderRadius: 16, padding: 24, gap: 12 },
})
