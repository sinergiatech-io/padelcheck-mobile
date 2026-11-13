import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import {
  emptyDay, emptyWeek, parseSportSettings, type DaySchedule, type SportSettings, type Weekday, type WeeklySchedule,
} from './club-profile-model'

function clone(settings: SportSettings): SportSettings {
  return JSON.parse(JSON.stringify(settings)) as SportSettings
}

function validateDay(day: DaySchedule): string | null {
  if (day.status !== 'OPEN') return null
  if (!day.intervals.length) return 'Agregá al menos una franja o marcá el día como cerrado'
  for (const interval of day.intervals) {
    if (!interval.open || !interval.close) return 'Completá apertura y cierre'
    if (interval.open >= interval.close) return 'La apertura debe ser anterior al cierre'
  }
  const sorted = [...day.intervals].sort((a, b) => a.open.localeCompare(b.open))
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].close > sorted[i].open) return 'Las franjas no pueden solaparse'
  }
  return null
}

export function useSportSettings(clubId: string | null) {
  const [saved, setSaved] = useState<SportSettings | null>(null)
  const [draft, setDraft] = useState<SportSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [result, setResult] = useState<'success' | 'error' | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dayDraft, setDayDraft] = useState<{ day: Weekday; value: DaySchedule } | null>(null)
  const loadedFor = useRef<string | null>(null)
  const flight = useRef(0)

  const reload = useCallback(async () => {
    if (!clubId) return
    const id = ++flight.current
    setLoading(true)
    setLoadError(false)
    setResult(null)
    try {
      const value = await apiClient.get<unknown>(`/clubs/${encodeURIComponent(clubId)}/sport-settings`, { timeoutMs: 15000 })
      if (id !== flight.current) return
      const settings = parseSportSettings(value)
      setSaved(settings)
      setDraft(clone(settings))
      loadedFor.current = clubId
    } catch {
      if (id !== flight.current) return
      setLoadError(true)
    } finally {
      if (id === flight.current) setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    if (!clubId) { setSaved(null); setDraft(null); loadedFor.current = null; return }
    if (loadedFor.current !== clubId) void reload()
  }, [clubId, reload])

  const dirty = Boolean(draft && saved && JSON.stringify(draft) !== JSON.stringify(saved))

  const patch = useCallback((partial: Partial<SportSettings>) => {
    setDraft(current => current ? { ...current, ...partial } : current)
    setResult(null)
    setErrors({})
  }, [])

  const discard = useCallback(() => {
    if (!saved) return
    setDraft(clone(saved))
    setDayDraft(null)
    setErrors({})
    setResult(null)
  }, [saved])

  const openDay = useCallback((day: Weekday) => {
    if (!draft) return
    const value = draft.weeklySchedule[day]
    setDayDraft({ day, value: value.status === 'UNCONFIGURED' ? { status: 'OPEN', intervals: [] } : JSON.parse(JSON.stringify(value)) })
  }, [draft])

  const applyDay = useCallback(() => {
    if (!dayDraft || !draft) return false
    const error = validateDay(dayDraft.value)
    if (error) { setErrors({ day: error }); return false }
    const weeklySchedule = { ...draft.weeklySchedule, [dayDraft.day]: dayDraft.value.status === 'OPEN' && !dayDraft.value.intervals.length
      ? emptyDay()
      : dayDraft.value } as WeeklySchedule
    patch({ weeklySchedule, partialWeek: Object.values(weeklySchedule).some(d => d.status === 'UNCONFIGURED') })
    setDayDraft(null)
    setErrors({})
    return true
  }, [dayDraft, draft, patch])

  const save = useCallback(async () => {
    if (!clubId || !draft || saving) return
    const nextErrors: Record<string, string> = {}
    if (!Number.isInteger(draft.defaultMatchDurationMinutes) || draft.defaultMatchDurationMinutes <= 0) {
      nextErrors.duration = 'La duración debe ser un entero positivo'
    }
    if (!Number.isInteger(draft.defaultRestMinutes) || draft.defaultRestMinutes < 0) {
      nextErrors.rest = 'El descanso debe ser un entero mayor o igual a 0'
    }
    for (const [key, day] of Object.entries(draft.weeklySchedule)) {
      const error = validateDay(day as DaySchedule)
      if (error) nextErrors[key] = error
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    setResult(null)
    try {
      const value = await apiClient.patch<unknown>(`/clubs/${encodeURIComponent(clubId)}/sport-settings`, {
        defaultMatchDurationMinutes: draft.defaultMatchDurationMinutes,
        defaultRestMinutes: draft.defaultRestMinutes,
        weeklySchedule: draft.weeklySchedule,
      }, { timeoutMs: 15000 })
      const settings = parseSportSettings(value)
      setSaved(settings)
      setDraft(clone(settings))
      setResult('success')
    } catch {
      setResult('error')
    } finally {
      setSaving(false)
    }
  }, [clubId, draft, saving])

  return useMemo(() => ({
    saved, draft: draft ?? { clubId: clubId ?? '', defaultMatchDurationMinutes: 90, defaultRestMinutes: 60, weeklySchedule: emptyWeek(), partialWeek: true },
    loading: loading || (!!clubId && loadedFor.current !== clubId), saving, loadError, result, errors, dirty, dayDraft,
    reload, patch, discard, save, openDay, applyDay, setDayDraft, setErrors,
  }), [saved, draft, clubId, loading, saving, loadError, result, errors, dirty, dayDraft, reload, patch, discard, save, openDay, applyDay])
}
