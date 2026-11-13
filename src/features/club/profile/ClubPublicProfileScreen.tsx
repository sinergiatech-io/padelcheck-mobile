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
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { absoluteMedia, parsePublic, type ClubPublicProfile } from './club-profile-model'

export function ClubPublicProfileScreen({ preview = false }: { preview?: boolean }) {
  const { clubId: routeClubId } = useLocalSearchParams<{ clubId?: string }>()
  const { user, destination } = useAuth()
  const insets = useSafeAreaInsets()
  const context = destination?.kind === 'club'
    ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  const clubId = preview ? context?.clubId ?? null : routeClubId ?? null
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

  return (
    <StartupReady>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#100e16' }}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => preview ? router.replace('/club/settings/info' as Href) : router.back()}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 22 }}>←</Text>
            </Pressable>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{preview ? 'Vista previa pública' : 'Perfil del club'}</Text>
          </View>
          <RefreshableScrollView refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} contentContainerStyle={{ paddingBottom: 32 }}>
            {loading ? <ActivityIndicator style={{ marginTop: 24 }} />
              : error ? <View style={{ padding: 16, gap: 12 }}><Text>No pudimos cargar el perfil.</Text><Button onPress={() => { setLoading(true); void load() }}>Reintentar</Button></View>
                : profile && <>
                  {cover ? <Image source={{ uri: cover }} style={{ width: '100%', aspectRatio: 370 / 184 }} /> : null}
                  <View style={{ padding: 16, gap: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
                      {logo ? <Image source={{ uri: logo }} style={{ width: 64, height: 64, borderRadius: 12 }} /> : null}
                      <View>
                        <Text style={{ fontSize: 20, fontWeight: '700' }}>{profile.name}</Text>
                        {(profile.city || profile.countryDivision) ? <Text style={{ color: '#605e64' }}>{[profile.city, profile.countryDivision].filter(Boolean).join(', ')}</Text> : null}
                      </View>
                    </View>
                    {profile.status === 'INACTIVE' && <Text style={{ backgroundColor: '#fff8e1', padding: 12, borderRadius: 8 }}>Este club está inactivo. No admite nuevas inscripciones.</Text>}
                    {profile.description ? <Text>{profile.description}</Text> : null}
                    {profile.contactEmail ? <Text>Email: {profile.contactEmail}</Text> : null}
                    {profile.contactPhone ? <Text>Teléfono: {profile.contactPhone}</Text> : null}
                    {profile.instagramUrl ? <Pressable onPress={() => void Linking.openURL(profile.instagramUrl!)}><Text style={{ textDecorationLine: 'underline' }}>Instagram</Text></Pressable> : null}
                    {profile.facebookUrl ? <Pressable onPress={() => void Linking.openURL(profile.facebookUrl!)}><Text style={{ textDecorationLine: 'underline' }}>Facebook</Text></Pressable> : null}
                    <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 8 }}>Torneos</Text>
                    <Text style={{ color: '#605e64' }}>Los torneos públicos se listarán aquí cuando esté disponible esa capacidad.</Text>
                  </View>
                </>}
          </RefreshableScrollView>
          {preview && <ClubBottomNav onDashboard={() => router.replace('/dashboard')} onClub={() => router.replace('/club/settings' as Href)} bottomInset={insets.bottom} />}
        </View>
      </SafeAreaView>
    </StartupReady>
  )
}
