import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiClient, ApiError } from '@/lib/api-client'
import { API_BASE } from '@/lib/constants'
import {
  absoluteMedia, framing, mediaKeyFromUrl, parseProfile, type ClubProfile, type ImageFraming, type LocationDto,
} from './club-profile-model'

export type MediaAsset = { uri: string; name: string; type: string; size?: number }

export type ProfileDraft = {
  name: string
  contactEmail: string
  contactPhone: string
  description: string
  instagramUrl: string
  facebookUrl: string
  logoUrl: string | null
  coverPhotoUrl: string | null
  logoKey: string | null
  coverKey: string | null
  clearLogo: boolean
  clearCover: boolean
  logoFraming: ImageFraming
  coverFraming: ImageFraming
  provinceId: string | null
  provinceName: string | null
  localityId: string | null
  localityName: string | null
  locationDirty: boolean
}

function draftFrom(profile: ClubProfile): ProfileDraft {
  return {
    name: profile.name,
    contactEmail: profile.contactEmail,
    contactPhone: profile.contactPhone ?? '',
    description: profile.description ?? '',
    instagramUrl: profile.instagramUrl ?? '',
    facebookUrl: profile.facebookUrl ?? '',
    logoUrl: absoluteMedia(profile.logoUrl, API_BASE),
    coverPhotoUrl: absoluteMedia(profile.coverPhotoUrl, API_BASE),
    logoKey: mediaKeyFromUrl(profile.logoUrl),
    coverKey: mediaKeyFromUrl(profile.coverPhotoUrl),
    clearLogo: false,
    clearCover: false,
    logoFraming: framing(profile.logoFraming),
    coverFraming: framing(profile.coverFraming),
    provinceId: profile.location?.provinceId ?? null,
    provinceName: profile.location?.provinceName ?? null,
    localityId: profile.location?.localityId ?? null,
    localityName: profile.location?.localityName ?? null,
    locationDirty: false,
  }
}

function same(a: ProfileDraft, b: ProfileDraft) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function useClubProfile(clubId: string | null) {
  const [saved, setSaved] = useState<ClubProfile | null>(null)
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [baseline, setBaseline] = useState<ProfileDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [result, setResult] = useState<'success' | 'error' | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const loadedFor = useRef<string | null>(null)
  const flight = useRef(0)

  const reload = useCallback(async () => {
    if (!clubId) return
    const id = ++flight.current
    setLoading(true)
    setLoadError(false)
    setResult(null)
    try {
      const value = await apiClient.get<unknown>(`/clubs/${encodeURIComponent(clubId)}`, { timeoutMs: 15000 })
      if (id !== flight.current) return
      const profile = parseProfile(value)
      const next = draftFrom(profile)
      setSaved(profile)
      setDraft(next)
      setBaseline(next)
      loadedFor.current = clubId
      setFieldErrors({})
    } catch {
      if (id !== flight.current) return
      setLoadError(true)
    } finally {
      if (id === flight.current) setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    if (!clubId) {
      setSaved(null); setDraft(null); setBaseline(null); loadedFor.current = null
      return
    }
    if (loadedFor.current !== clubId) void reload()
  }, [clubId, reload])

  const dirty = Boolean(draft && baseline && !same(draft, baseline))

  const patch = useCallback((partial: Partial<ProfileDraft>) => {
    setDraft(current => current ? { ...current, ...partial } : current)
    setResult(null)
    setFieldErrors({})
  }, [])

  const discard = useCallback(() => {
    if (!baseline) return
    setDraft(baseline)
    setFieldErrors({})
    setResult(null)
  }, [baseline])

  const validate = useCallback((value: ProfileDraft) => {
    const errors: Record<string, string> = {}
    if (!value.name.trim()) errors.name = 'Ingresá el nombre del club'
    if (!value.contactEmail.trim()) errors.contactEmail = 'Ingresá el email de contacto'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contactEmail.trim())) errors.contactEmail = 'Email inválido'
    if (value.description.length > 1000) errors.description = 'Máximo 1000 caracteres'
    if (value.instagramUrl && !/^https?:\/\//i.test(value.instagramUrl)) errors.instagramUrl = 'Usá una URL HTTP o HTTPS'
    if (value.facebookUrl && !/^https?:\/\//i.test(value.facebookUrl)) errors.facebookUrl = 'Usá una URL HTTP o HTTPS'
    if (value.locationDirty || !saved?.location) {
      if (!value.provinceId) errors.province = 'Seleccioná una provincia'
      if (!value.localityId) errors.locality = 'Seleccioná una localidad'
    }
    return errors
  }, [saved])

  const save = useCallback(async () => {
    if (!clubId || !draft || saving || uploading) return
    const errors = validate(draft)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    setSaving(true)
    setResult(null)
    try {
      const body: Record<string, unknown> = {
        name: draft.name.trim(),
        contactEmail: draft.contactEmail.trim(),
        contactPhone: draft.contactPhone.trim() || null,
        description: draft.description.trim() || null,
        instagramUrl: draft.instagramUrl.trim() || null,
        facebookUrl: draft.facebookUrl.trim() || null,
        logoFraming: draft.logoFraming,
        coverFraming: draft.coverFraming,
      }
      if (draft.clearLogo) body.clearLogo = true
      else if (draft.logoKey && draft.logoKey !== mediaKeyFromUrl(saved?.logoUrl)) body.logoUrl = draft.logoKey
      if (draft.clearCover) body.clearCover = true
      else if (draft.coverKey && draft.coverKey !== mediaKeyFromUrl(saved?.coverPhotoUrl)) body.coverPhotoUrl = draft.coverKey
      if (draft.provinceId && draft.localityId && (draft.locationDirty || !saved?.location)) {
        body.location = { countryCode: 'AR', provinceId: draft.provinceId, localityId: draft.localityId }
      }
      const value = await apiClient.patch<unknown>(`/clubs/${encodeURIComponent(clubId)}`, body, { timeoutMs: 20000 })
      const profile = parseProfile(value)
      const next = draftFrom(profile)
      setSaved(profile)
      setDraft(next)
      setBaseline(next)
      setResult('success')
    } catch {
      setResult('error')
    } finally {
      setSaving(false)
    }
  }, [clubId, draft, saving, uploading, validate, saved])

  const uploadMedia = useCallback(async (kind: 'logo' | 'cover', asset: MediaAsset): Promise<{ kind: 'logo' | 'cover'; mediaKey: string; url: string } | null> => {
    if (!clubId || uploading || saving) return null
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/jpg'].includes(asset.type)) {
      setFieldErrors(current => ({ ...current, [kind]: 'Usá PNG, JPEG o WebP' }))
      return null
    }
    if (asset.size && asset.size > 5 * 1024 * 1024) {
      setFieldErrors(current => ({ ...current, [kind]: 'La imagen supera 5 MB' }))
      return null
    }
    setUploading(kind)
    setFieldErrors(current => { const next = { ...current }; delete next[kind]; return next })
    try {
      const form = new FormData()
      form.append('file', { uri: asset.uri, name: asset.name, type: asset.type === 'image/jpg' ? 'image/jpeg' : asset.type } as unknown as Blob)
      const value = await apiClient.postForm<{ mediaKey: string; url: string }>(
        `/clubs/${encodeURIComponent(clubId)}/media/${kind}`, form, { timeoutMs: 30000 })
      const preview = absoluteMedia(value.url, API_BASE) ?? value.url
      return { kind, mediaKey: value.mediaKey, url: preview }
    } catch {
      setFieldErrors(current => ({ ...current, [kind]: 'No pudimos subir la imagen. Probá de nuevo.' }))
      return null
    } finally {
      setUploading(null)
    }
  }, [clubId, uploading, saving])

  const applyUploaded = useCallback((media: { kind: 'logo' | 'cover'; mediaKey: string; url: string }, nextFraming: ImageFraming) => {
    if (media.kind === 'logo') {
      patch({ logoUrl: media.url, logoKey: media.mediaKey, clearLogo: false, logoFraming: nextFraming })
    } else {
      patch({ coverPhotoUrl: media.url, coverKey: media.mediaKey, clearCover: false, coverFraming: nextFraming })
    }
  }, [patch])

  const setLocation = useCallback((location: Pick<LocationDto, 'provinceId' | 'provinceName' | 'localityId' | 'localityName'> | null) => {
    if (!location) {
      patch({ provinceId: null, provinceName: null, localityId: null, localityName: null, locationDirty: true })
      return
    }
    patch({
      provinceId: location.provinceId,
      provinceName: location.provinceName,
      localityId: location.localityId,
      localityName: location.localityName,
      locationDirty: true,
    })
  }, [patch])

  const deactivate = useCallback(async () => {
    if (!clubId || statusBusy) return false
    setStatusBusy(true)
    setActionError(null)
    try {
      const value = await apiClient.post<unknown>(`/clubs/${encodeURIComponent(clubId)}/deactivate`, undefined, { timeoutMs: 15000 })
      const profile = parseProfile(value)
      const next = draftFrom(profile)
      setSaved(profile)
      setDraft(next)
      setBaseline(next)
      return true
    } catch (error) {
      setActionError(error instanceof ApiError && error.message === 'CLUB_HAS_ACTIVE_EVENTS' ? 'CLUB_HAS_ACTIVE_EVENTS' : 'error')
      return false
    } finally {
      setStatusBusy(false)
    }
  }, [clubId, statusBusy])

  const reactivate = useCallback(async () => {
    if (!clubId || statusBusy) return false
    setStatusBusy(true)
    setActionError(null)
    try {
      const value = await apiClient.post<unknown>(`/clubs/${encodeURIComponent(clubId)}/reactivate`, undefined, { timeoutMs: 15000 })
      const profile = parseProfile(value)
      const next = draftFrom(profile)
      setSaved(profile)
      setDraft(next)
      setBaseline(next)
      return true
    } catch {
      setActionError('error')
      return false
    } finally {
      setStatusBusy(false)
    }
  }, [clubId, statusBusy])

  return useMemo(() => ({
    saved, draft, loading: loading || (!!clubId && loadedFor.current !== clubId), saving, uploading,
    loadError, result, fieldErrors, dirty, actionError, statusBusy,
    reload, patch, discard, save, uploadMedia, applyUploaded, setLocation, deactivate, reactivate, setActionError, setFieldErrors,
  }), [saved, draft, loading, clubId, saving, uploading, loadError, result, fieldErrors, dirty, actionError, statusBusy,
    reload, patch, discard, save, uploadMedia, applyUploaded, setLocation, deactivate, reactivate])
}
