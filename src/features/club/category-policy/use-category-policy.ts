import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { parseCatalog, parsePolicy, type Category } from './category-policy'

export function useCategoryPolicy(clubId: string | null) {
  const [categories, setCategories] = useState<Category[]>([])
  const [saved, setSaved] = useState(0)
  const [draft, setDraft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [result, setResult] = useState<'success' | 'error' | null>(null)
  const sequence = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const sending = useRef(false)
  const cancelRequests = useCallback(() => {
    sequence.current++
    controller.current?.abort()
  }, [])

  const reload = useCallback(async () => {
    const request = ++sequence.current
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    if (!clubId) { setLoading(false); return }
    setLoading(true)
    setLoadError(false)
    setResult(null)
    try {
      const [catalog, policy] = await Promise.all([
        apiClient.get<unknown>('/categories', { signal: abort.signal, timeoutMs: 15000 }),
        apiClient.get<unknown>(`/clubs/${encodeURIComponent(clubId)}/category-policy`, { signal: abort.signal, timeoutMs: 15000 }),
      ])
      const parsed = parsePolicy(policy, clubId)
      const levels = parseCatalog(catalog)
      if (request !== sequence.current || abort.signal.aborted) return
      setCategories(levels)
      setSaved(parsed.allowedHigherCategoriesCount)
      setDraft(parsed.allowedHigherCategoriesCount)
    } catch {
      if (request === sequence.current && !abort.signal.aborted) setLoadError(true)
    } finally {
      if (request === sequence.current && !abort.signal.aborted) {
        setLoadedFor(clubId)
        setLoading(false)
      }
    }
  }, [clubId])
  useEffect(() => {
    sending.current = false
    setSaving(false)
    void reload()
    return cancelRequests
  }, [reload, cancelRequests])

  const select = (count: number) => {
    if (sending.current || !Number.isInteger(count) || count < 0 || count > 7) return
    setDraft(count)
    setResult(null)
  }
  const save = async () => {
    if (!clubId || loadedFor !== clubId || sending.current || loading || loadError || draft === saved) return
    sending.current = true
    setSaving(true)
    setResult(null)
    const request = sequence.current
    const abort = new AbortController()
    controller.current = abort
    try {
      const response = await apiClient.patch<unknown>(`/clubs/${encodeURIComponent(clubId)}/category-policy`,
        { allowedHigherCategoriesCount: draft }, { signal: abort.signal, timeoutMs: 15000 })
      const policy = parsePolicy(response, clubId)
      if (request !== sequence.current || abort.signal.aborted) return
      setSaved(policy.allowedHigherCategoriesCount)
      setDraft(policy.allowedHigherCategoriesCount)
      setResult('success')
    } catch {
      if (request === sequence.current && !abort.signal.aborted) setResult('error')
    } finally {
      if (request === sequence.current && !abort.signal.aborted) {
        sending.current = false
        setSaving(false)
      }
    }
  }
  return { categories, saved, draft, loading: loading || (!!clubId && loadedFor !== clubId), saving, loadError, result, reload, select, save,
    dirty: loadedFor === clubId && !loading && !loadError && draft !== saved, discard: () => setDraft(saved) }
}
