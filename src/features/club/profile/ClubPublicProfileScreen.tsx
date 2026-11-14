import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native'
import { router, useLocalSearchParams, type Href } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { SvgXml } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { useRefreshControl } from '@/hooks/use-refresh-control'
import { useAuth } from '@/context/AuthContext'
import { apiClient } from '@/lib/api-client'
import { API_BASE } from '@/lib/constants'
import { StartupReady } from '@/features/startup/StartupReady'
import { ClubBottomNav, PlayerBottomNav } from '../category-policy/ClubBottomNav'
import { absoluteMedia, framing, parsePublic, type ClubPublicProfile } from './club-profile-model'
import { FramedImage } from './FramedImage'
import { venueIcons } from '../venues/venue-icons'

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : null
}

export function ClubPublicProfileScreen({ preview = false }: { preview?: boolean }) {
  const { clubId: routeClubId } = useLocalSearchParams<{ clubId?: string }>()
  const { user, destination } = useAuth()
  const insets = useSafeAreaInsets()
  const context = destination?.kind === 'club'
    ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  const clubId = preview ? context?.clubId ?? null : routeClubId ?? null
  /** Admin preview → Mi Club; authenticated player → player shell; anonymous → no bottom nav. */
  const playerShell = !preview && (destination?.kind === 'player' || Boolean(user?.hasPlayerProfile))
  const [profile, setProfile] = useState<ClubPublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const request = useRef<{ clubId: string; abort: AbortController; promise: Promise<void> } | null>(null)

  const load = useCallback((): Promise<void> => {
    if (!clubId) {
      setLoading(false)
      setError(true)
      return Promise.resolve()
    }
    if (request.current?.clubId === clubId && !request.current.abort.signal.aborted) return request.current.promise
    request.current?.abort.abort()
    const abort = new AbortController()
    setError(false)
    const promise = (async () => {
      try {
        const value = await apiClient.get<unknown>(`/clubs/${encodeURIComponent(clubId)}/public`, { signal: abort.signal, timeoutMs: 15000 })
        if (!abort.signal.aborted) setProfile(parsePublic(value))
      } catch {
        if (!abort.signal.aborted) setError(true)
      } finally {
        if (!abort.signal.aborted) setLoading(false)
        if (request.current?.abort === abort) request.current = null
      }
    })()
    request.current = { clubId, abort, promise }
    return promise
  }, [clubId])

  useEffect(() => {
    setProfile(null)
    setLoading(true)
    void load()
    return () => { request.current?.abort.abort() }
  }, [load])

  const refresh = useRefreshControl(async () => {
    await load()
  })

  const cover = absoluteMedia(profile?.coverPhotoUrl, API_BASE)
  const logo = absoluteMedia(profile?.logoUrl, API_BASE)
  const hasContact = Boolean(profile?.contactPhone || profile?.contactEmail)
  const hasSocial = Boolean(profile?.instagramUrl || profile?.facebookUrl)
  const wa = profile?.contactPhone ? whatsappHref(profile.contactPhone) : null
  const locationLabel = [...new Set([profile?.city, profile?.countryDivision].filter(Boolean))].join(', ')

  return (
    <StartupReady>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#100e16' }}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#100e16' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => preview ? router.replace('/club/settings/info' as Href) : router.back()}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Text className="font-inter-500" style={{ color: '#fff', fontSize: 22 }}>←</Text>
            </Pressable>
            <Text className="font-inter-700" style={{ color: '#fff', fontSize: 20 }}>{preview ? 'Vista previa del club' : 'Perfil del club'}</Text>
          </View>
          <RefreshableScrollView refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 24 }}>
            {preview && <View style={{ minHeight: 78, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#c2d8fc', backgroundColor: '#ebf3fe' }}>
              <SvgXml xml={venueIcons.info.xml} width={24} height={24} />
              <View style={{ flex: 1, gap: 2 }}><Text className="font-inter-600" style={{ fontSize: 14 }}>Vista previa</Text><Text className="font-sans" style={{ fontSize: 12, color: '#605e64' }}>Mostramos los datos guardados.</Text></View>
            </View>}
            {error && <View style={{ gap: 12 }}><Text className="font-sans">{profile ? 'No pudimos actualizar el perfil. Mostramos los últimos datos disponibles.' : 'No pudimos cargar el perfil.'}</Text><Button onPress={() => { if (!profile) setLoading(true); void load() }}>Reintentar</Button></View>}
            {loading && !profile ? <ActivityIndicator style={{ marginTop: 24 }} />
                : profile && <>
                  <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
                    {cover ? <FramedImage uri={cover} framingValue={framing(profile.coverFraming)} mode="cover" style={{ width: '100%', aspectRatio: 370 / 184 }} /> : null}
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16 }}>
                      {logo ? <FramedImage uri={logo} framingValue={framing(profile.logoFraming)} mode="contain" style={{ width: 64, height: 64, borderRadius: 12 }} /> : null}
                      <View style={{ flex: 1 }}>
                        <Text className="font-inter-700" style={{ fontSize: 20 }} numberOfLines={1}>{profile.name}</Text>
                        {locationLabel
                          ? <Text className="font-sans" style={{ color: '#605e64' }}>{locationLabel}</Text>
                          : null}
                      </View>
                    </View>
                  </View>

                  {profile.status === 'INACTIVE' && (
                    <Text className="font-sans" style={{ backgroundColor: '#fff8e1', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#f6de8d' }}>
                      Este club está inactivo. No admite nuevas inscripciones.
                    </Text>
                  )}

                  {profile.description ? (
                    <View style={{ gap: 8 }}>
                      <Text className="font-inter-600" style={{ fontSize: 16 }}>Sobre el club</Text>
                      <Text className="font-sans" style={{ color: '#413f46', lineHeight: 22 }}>{profile.description}</Text>
                    </View>
                  ) : null}

                  {hasContact ? (
                    <View style={{ gap: 8 }}>
                      <Text className="font-inter-600" style={{ fontSize: 16 }}>Contacto</Text>
                      {profile.contactPhone ? (
                        <Pressable
                          disabled={!wa}
                          onPress={() => { if (wa) void Linking.openURL(wa) }}
                          style={{ minHeight: 48, justifyContent: 'center', borderRadius: 8, backgroundColor: '#e7e7e8', paddingHorizontal: 16 }}
                        >
                          <Text className="font-inter-500">{wa ? `WhatsApp · ${profile.contactPhone}` : profile.contactPhone}</Text>
                        </Pressable>
                      ) : null}
                      {profile.contactEmail ? (
                        <Pressable
                          onPress={() => void Linking.openURL(`mailto:${profile.contactEmail}`)}
                          style={{ minHeight: 48, justifyContent: 'center', borderRadius: 8, backgroundColor: '#e7e7e8', paddingHorizontal: 16 }}
                        >
                          <Text className="font-inter-500">{profile.contactEmail}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  {hasSocial ? (
                    <View style={{ gap: 8 }}>
                      <Text className="font-inter-600" style={{ fontSize: 16 }}>Redes sociales</Text>
                      <View style={{ flexDirection: 'row', gap: 16 }}>
                        {profile.instagramUrl ? (
                          <Pressable onPress={() => void Linking.openURL(profile.instagramUrl!)}>
                            <Text className="font-inter-500">Instagram</Text>
                          </Pressable>
                        ) : null}
                        {profile.facebookUrl ? (
                          <Pressable onPress={() => void Linking.openURL(profile.facebookUrl!)}>
                            <Text className="font-inter-500">Facebook</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </>}
          </RefreshableScrollView>
          {preview ? (
            <ClubBottomNav onDashboard={() => router.replace('/dashboard')} onClub={() => router.replace('/club/settings' as Href)} bottomInset={insets.bottom} />
          ) : playerShell ? (
            <PlayerBottomNav bottomInset={insets.bottom} />
          ) : null}
        </View>
      </SafeAreaView>
    </StartupReady>
  )
}
