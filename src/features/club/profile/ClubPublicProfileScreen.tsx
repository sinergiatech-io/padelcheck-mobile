import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native'
import { router, useLocalSearchParams, type Href } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Button } from '@/components/ui/button'
import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view'
import { useRefreshControl } from '@/hooks/use-refresh-control'
import { useAuth } from '@/context/AuthContext'
import { apiClient } from '@/lib/api-client'
import { API_BASE } from '@/lib/constants'
import { StartupReady } from '@/features/startup/StartupReady'
import { ClubBottomNav, PlayerBottomNav } from '../category-policy/ClubBottomNav'
import { absoluteMedia, parsePublic, type ClubPublicProfile } from './club-profile-model'

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

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!clubId) return
    setError(false)
    try {
      const value = await apiClient.get<unknown>(`/clubs/${encodeURIComponent(clubId)}/public`, { signal, timeoutMs: 15000 })
      if (signal?.aborted) return
      setProfile(parsePublic(value))
    } catch {
      if (!signal?.aborted) setError(true)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    setLoading(true)
    const abort = new AbortController()
    void load(abort.signal)
    return () => abort.abort()
  }, [load])

  const refresh = useRefreshControl(async () => {
    await load()
  })

  const cover = absoluteMedia(profile?.coverPhotoUrl, API_BASE)
  const logo = absoluteMedia(profile?.logoUrl, API_BASE)
  const hasContact = Boolean(profile?.contactPhone || profile?.contactEmail)
  const hasSocial = Boolean(profile?.instagramUrl || profile?.facebookUrl)
  const wa = profile?.contactPhone ? whatsappHref(profile.contactPhone) : null

  return (
    <StartupReady>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#100e16' }}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => preview ? router.replace('/club/settings/info' as Href) : router.back()}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Text className="font-inter-500" style={{ color: '#fff', fontSize: 22 }}>←</Text>
            </Pressable>
            <Text className="font-inter-700" style={{ color: '#fff', fontSize: 20 }}>{preview ? 'Vista previa pública' : 'Perfil del club'}</Text>
          </View>
          <RefreshableScrollView refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 24 }}>
            {loading ? <ActivityIndicator style={{ marginTop: 24 }} />
              : error ? <View style={{ gap: 12 }}><Text className="font-sans">No pudimos cargar el perfil.</Text><Button onPress={() => { setLoading(true); void load() }}>Reintentar</Button></View>
                : profile && <>
                  <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
                    {cover ? <Image source={{ uri: cover }} style={{ width: '100%', aspectRatio: 370 / 184 }} /> : null}
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16 }}>
                      {logo
                        ? <Image source={{ uri: logo }} style={{ width: 64, height: 64, borderRadius: 12 }} />
                        : <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#e7e7e8' }} />}
                      <View style={{ flex: 1 }}>
                        <Text className="font-inter-700" style={{ fontSize: 20 }} numberOfLines={1}>{profile.name}</Text>
                        {(profile.city || profile.countryDivision)
                          ? <Text className="font-sans" style={{ color: '#605e64' }}>{[profile.city, profile.countryDivision].filter(Boolean).join(', ')}</Text>
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
