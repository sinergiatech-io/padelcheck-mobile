import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Redirect, router, useFocusEffect, usePreventRemove, type Href } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { SvgXml } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/context/AuthContext'
import { SessionUnverified } from '@/features/auth/SessionUnverified'
import { StartupReady } from '@/features/startup/StartupReady'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { WEEKDAYS, daySummary, weekSummary, type Weekday } from './club-profile-model'
import { useSportSettings } from './use-sport-settings'

const HOME = '/club/settings'
const field = { borderWidth: 1, borderColor: '#929195', borderRadius: 8, paddingHorizontal: 16, minHeight: 56, backgroundColor: '#fefefe', color: '#120f18' } as const
const TRASH_XML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 21C6.45 21 5.979 20.804 5.587 20.412C5.195 20.02 4.999 19.549 5 19V7H4V5H9V4H15V5H20V7H19V19C19 19.55 18.804 20.021 18.412 20.413C18.02 20.805 17.549 21.001 17 21H7ZM9 17H11V9H9V17ZM13 17H15V9H13V17Z" fill="#D93E3E"/></svg>'

function useClubAccess() {
  const { user, destination, phase } = useAuth()
  const context = destination?.kind === 'club' ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  return { phase, destination, allowed: phase === 'ready' && Boolean(context?.permissions?.includes('MANAGE_CLUB_SETTINGS')), clubId: context?.clubId ?? null }
}

export function ClubSportSettingsScreen() {
  const access = useClubAccess()
  const insets = useSafeAreaInsets()
  const settings = useSportSettings(access.allowed ? access.clubId : null)
  const [weekDiscard, setWeekDiscard] = useState(false)
  const [dayDiscard, setDayDiscard] = useState(false)
  const pendingNav = useRef<Href | null>(null)

  usePreventRemove((settings.dirty || settings.saving || !!settings.dayDraft) && !weekDiscard && !dayDiscard, ({ data }) => {
    if (settings.saving) return
    if (settings.dayDraft) {
      setDayDiscard(true)
      return
    }
    pendingNav.current = data.action.type === 'GO_BACK'
      ? (HOME as Href)
      : ((data.action.payload as { href?: string } | undefined)?.href as Href | undefined) ?? (HOME as Href)
    setWeekDiscard(true)
  })

  // Drop in-progress day draft when leaving this screen so deep-links elsewhere don't keep the day modal.
  useFocusEffect(useCallback(() => () => {
    settings.setDayDraft(null)
    setDayDiscard(false)
  }, [settings.setDayDraft]))

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
              <Pressable accessibilityLabel="Volver" onPress={() => setDayDiscard(true)} style={s.iconBtn}><Text style={{ color: '#fff', fontSize: 22 }}>←</Text></Pressable>
              <Text className="font-inter-700" style={s.title}>Horario del {label.toLowerCase()}</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              <View style={s.switchRow}>
                <Text className="font-inter-500">Abierto</Text>
                <Switch value={open} onValueChange={checked => settings.setDayDraft({
                  day: day.day,
                  value: checked
                    ? { status: 'OPEN', intervals: day.value.intervals.length ? day.value.intervals : [{ open: '', close: '' }] }
                    : { status: 'CLOSED', intervals: [] },
                })} />
              </View>
              {open && (
                <View style={{ gap: 12 }}>
                  <View style={s.switchRow}>
                    <Text className="font-inter-600" style={{ fontSize: 16 }}>Franjas horarias</Text>
                    <Pressable
                      accessibilityLabel="Agregar franja"
                      onPress={() => settings.setDayDraft({
                        day: day.day,
                        value: { ...day.value, intervals: [...day.value.intervals, { open: '', close: '' }] },
                      })}
                      style={s.plusBtn}
                    >
                      <Text style={{ fontSize: 22, fontWeight: '600' }}>+</Text>
                    </Pressable>
                  </View>
                  {day.value.intervals.map((interval, index) => (
                    <View key={index} style={{ gap: 6 }}>
                      <Text style={{ fontWeight: '500', color: '#413f46' }}>Franja {index + 1}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={s.help}>Apertura</Text>
                          <TextInput value={interval.open} placeholder="09:00" style={field} onChangeText={openTime => {
                            const intervals = day.value.intervals.map((item, i) => i === index ? { ...item, open: openTime } : item)
                            settings.setDayDraft({ day: day.day, value: { ...day.value, intervals } })
                          }} />
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={s.help}>Cierre</Text>
                          <TextInput value={interval.close} placeholder="24:00" style={field} onChangeText={close => {
                            const intervals = day.value.intervals.map((item, i) => i === index ? { ...item, close } : item)
                            settings.setDayDraft({ day: day.day, value: { ...day.value, intervals } })
                          }} />
                        </View>
                        <Pressable
                          accessibilityLabel={`Quitar franja ${index + 1}`}
                          onPress={() => settings.setDayDraft({
                            day: day.day,
                            value: { ...day.value, intervals: day.value.intervals.filter((_, i) => i !== index) },
                          })}
                          style={s.trashBtn}
                        >
                          <SvgXml xml={TRASH_XML} width={20} height={20} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  <Text style={s.help}>Las franjas no pueden superponerse ni cruzar medianoche</Text>
                </View>
              )}
              {settings.errors.day && <Text style={{ color: '#aa3030' }}>{settings.errors.day}</Text>}
            </ScrollView>
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <Text style={[s.help, { textAlign: 'center', marginBottom: 8 }]}>Se aplicará al guardar la semana</Text>
              <Button onPress={() => settings.applyDay()}>Aplicar horario</Button>
            </View>
            <ClubBottomNav onDashboard={() => router.replace('/dashboard')} onClub={() => router.replace(HOME as Href)} busy={false} bottomInset={insets.bottom} />
          </View>
          <Modal transparent visible={dayDiscard} animationType="fade" onRequestClose={() => setDayDiscard(false)}>
            <View style={s.overlay}>
              <View style={s.dialog}>
                <Text style={{ fontSize: 18, fontWeight: '600' }}>¿Descartar cambios del día?</Text>
                <Button variant="secondary" onPress={() => setDayDiscard(false)}>Seguir editando</Button>
                <Button onPress={() => { settings.setDayDraft(null); setDayDiscard(false) }}>Descartar</Button>
              </View>
            </View>
          </Modal>
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
              if (settings.dirty) {
                pendingNav.current = HOME as Href
                setWeekDiscard(true)
              } else router.replace(HOME as Href)
            }} style={s.iconBtn}><Text style={{ color: '#fff', fontSize: 22 }}>←</Text></Pressable>
            <Text className="font-inter-700" style={s.title}>Configuración de torneos</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
            {!access.allowed ? <Text>No tenés permiso para gestionar la configuración de este club.</Text>
              : settings.loading ? <Text>Cargando configuración…</Text>
                : settings.loadError ? <View style={{ gap: 12 }}><Text>No pudimos cargar la configuración.</Text><Button onPress={() => void settings.reload()}>Reintentar</Button></View>
                  : <>
                    {settings.result && <Text style={{ color: settings.result === 'error' ? '#aa3030' : '#078332' }}>{settings.result === 'success' ? 'Cambios guardados' : 'No pudimos guardar'}</Text>}
                    <View style={{ gap: 8 }}>
                      <Text className="font-inter-600" style={s.section}>Parámetros del partido</Text>
                      <Text className="font-sans" style={s.help}>Valores iniciales para nuevos torneos</Text>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ fontWeight: '500' }}>Duración (min)</Text>
                          <TextInput keyboardType="number-pad" style={field} value={String(settings.draft.defaultMatchDurationMinutes)}
                            onChangeText={v => settings.patch({ defaultMatchDurationMinutes: Number(v) || 0 })} editable={!settings.saving} />
                          <Text style={s.help}>Estimada por partido</Text>
                          {settings.errors.duration && <Text style={{ color: '#aa3030' }}>{settings.errors.duration}</Text>}
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ fontWeight: '500' }}>Descanso (min)</Text>
                          <TextInput keyboardType="number-pad" style={field} value={String(settings.draft.defaultRestMinutes)}
                            onChangeText={v => settings.patch({ defaultRestMinutes: Number(v) || 0 })} editable={!settings.saving} />
                          <Text style={s.help}>Mínimo entre partidos</Text>
                          {settings.errors.rest && <Text style={{ color: '#aa3030' }}>{settings.errors.rest}</Text>}
                        </View>
                      </View>
                      <Text style={s.help}>Los torneos existentes conservan su configuración</Text>
                    </View>
                    <View style={{ gap: 4 }}>
                      <Text className="font-inter-600" style={s.section}>Horario semanal del club</Text>
                      <Text className="font-sans" style={[s.help, { marginBottom: 4 }]}>{weekSummary(settings.draft.weeklySchedule, settings.draft.partialWeek)}</Text>
                      {WEEKDAYS.map(([key, label], index) => (
                        <Pressable
                          key={key}
                          disabled={settings.saving}
                          onPress={() => settings.openDay(key as Weekday)}
                          style={[s.dayRow, index > 0 && s.dayBorder]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '500' }}>{label}</Text>
                            <Text style={{ color: '#605e64' }}>{daySummary(settings.draft.weeklySchedule[key])}</Text>
                          </View>
                          <Text style={{ color: '#929195', fontSize: 20 }}>›</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>}
          </ScrollView>
          {access.allowed && !settings.loading && !settings.loadError && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <Text style={[s.help, { textAlign: 'center', marginBottom: 8 }]}>{settings.dirty ? 'Tenés cambios sin guardar' : 'Sin cambios pendientes'}</Text>
              <Button loading={settings.saving} loadingLabel="Guardando…" disabled={!settings.dirty} onPress={() => void settings.save()}>Guardar cambios</Button>
            </View>
          )}
          <ClubBottomNav onDashboard={() => router.replace('/dashboard')} onClub={() => router.replace(HOME as Href)} busy={settings.saving} bottomInset={insets.bottom} />
          <Modal transparent visible={weekDiscard} animationType="fade" onRequestClose={() => setWeekDiscard(false)}>
            <View style={s.overlay}>
              <View style={s.dialog}>
                <Text style={{ fontSize: 18, fontWeight: '600' }}>¿Descartar cambios de la semana?</Text>
                <Button variant="secondary" onPress={() => { setWeekDiscard(false); pendingNav.current = null }}>Seguir editando</Button>
                <Button onPress={() => {
                  settings.discard()
                  const dest = pendingNav.current ?? (HOME as Href)
                  pendingNav.current = null
                  setWeekDiscard(false)
                  requestAnimationFrame(() => router.replace(dest))
                }}>Descartar cambios</Button>
              </View>
            </View>
          </Modal>
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
  section: { fontSize: 16, fontWeight: '600' },
  help: { fontSize: 12, color: '#605e64' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plusBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#eef0c1', alignItems: 'center', justifyContent: 'center' },
  trashBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#fdecec', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8 },
  dayBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e7e7e8' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: '#0006', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: '#fff', borderRadius: 16, padding: 24, gap: 12 },
})
