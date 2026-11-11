import { useEffect, useRef, useState } from 'react'
import { createApiClient, ApiError } from '@/lib/http-client'
import { API_BASE } from '@/lib/constants'
import { parseCatalog, type Category } from '@/features/club/category-policy/category-policy'
import type { LocationRequest } from './registration-location'

// Registration never sends an existing account bearer or stores credentials.
const api = createApiClient({ baseUrl: API_BASE, getToken: () => null })
const options = { timeoutMs: 20000 }
export type Draft = { firstName: string; lastName: string; email: string; password: string; gender: string; baseCategoryId: string }
export type Proof = { sessionId: string; email: string; token: string }
type Stage = 'form' | 'pending' | 'verifying' | 'verified' | 'invalid' | 'expired' | 'verifyError' | 'active' | 'activationError'
export const emptyDraft: Draft = { firstName: '', lastName: '', email: '', password: '', gender: '', baseCategoryId: '' }
export function validateDraft(draft: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {}
  if (!draft.firstName.trim()) errors.firstName = 'Ingresá tu nombre.'
  if (!draft.lastName.trim()) errors.lastName = 'Ingresá tu apellido.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'Ingresá un email válido.'
  if (draft.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.'
  if (!['MALE', 'FEMALE'].includes(draft.gender)) errors.gender = 'Seleccioná tu sexo.'
  if (!draft.baseCategoryId) errors.baseCategoryId = 'Seleccioná tu categoría.'
  return errors
}
export function usePlayerRegistration(platform: 'WEB' | 'ANDROID' | 'IOS', initialProof?: Proof) {
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft })
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  const [stage, setStage] = useState<Stage>(initialProof ? 'verifying' : 'form')
  const [proof, setProof] = useState<Proof | undefined>(initialProof)
  const [busy, setBusy] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  const lock = useRef(false)
  const verifyPromise = useRef<Promise<unknown> | null>(null)
  useEffect(() => {
    let active = true
    setCatalogState('loading')
    api.get<unknown>('/categories', options).then(parseCatalog).then(data => {
      if (active) { setCategories(data); setCatalogState('ready') }
    }).catch(() => { if (active) setCatalogState('error') })
    return () => { active = false }
  }, [catalogAttempt])
  useEffect(() => {
    if (!initialProof) return
    let active = true
    verifyPromise.current ??= api.post('/onboarding/players/verify-email', initialProof, options)
    verifyPromise.current.then(() => { if (active) setStage('verified') }).catch(error => {
      if (active) setStage(error instanceof ApiError && error.status === 410 ? 'expired' :
        error instanceof ApiError && [400,404].includes(error.status) ? 'invalid' : 'verifyError')
    })
    return () => { active = false }
  }, [initialProof])
  async function action(kind: 'start' | 'resend' | 'complete' | 'verify', location?: LocationRequest) {
    if (lock.current) return
    if (kind === 'start') {
      const invalid = validateDraft(draft); setErrors(invalid)
      if (Object.keys(invalid).length || catalogState !== 'ready' || !location) return
    }
    lock.current = true; setBusy(true); setBusyAction(kind); setNotice(null); setResent(false)
    try {
      if (kind === 'start') {
        const result = await api.post<{ sessionId: string; managementToken: string }>('/onboarding/players/start', { ...draft, location, email: draft.email.trim(), platform }, options)
        setProof({ sessionId: result.sessionId, email: draft.email.trim(), token: result.managementToken })
        setDraft(current => ({ ...current, password: '' })); setStage('pending')
      } else if (kind === 'resend' && proof) {
        const result = await api.post<{ managementToken: string }>('/onboarding/players/resend-email', { sessionId: proof.sessionId, token: proof.token }, options)
        setProof({ ...proof, token: result.managementToken })
        setStage('pending'); setResent(true)
      } else if (kind === 'complete' && proof) {
        await api.post('/onboarding/players/complete', { sessionId: proof.sessionId, token: proof.token }, options)
        setStage('active')
      } else if (kind === 'verify' && proof) {
        await api.post('/onboarding/players/verify-email', proof, options); setStage('verified')
      }
    } catch (error) {
      if (kind === 'start' && error instanceof ApiError && error.status === 409) {
        setErrors({ email: 'Este email ya está registrado. Iniciá sesión con tu cuenta.' })
      } else if (kind === 'complete') setStage('activationError')
      else if (kind === 'verify' && error instanceof ApiError && error.status === 410) setStage('expired')
      else if (kind === 'verify' && error instanceof ApiError && [400,404].includes(error.status)) setStage('invalid')
      else setNotice(kind === 'start' ? 'No pudimos enviar la verificación' : kind === 'resend' ? 'No pudimos reenviar el email' : 'No pudimos verificar tu email')
    } finally { lock.current = false; setBusy(false); setBusyAction(null) }
  }
  function updateField(key: keyof Draft, value: string) {
    const next = { ...draft, [key]: value }
    setDraft(next)
    setErrors(current => current[key] ? { ...current, [key]: validateDraft(next)[key] } : current)
  }
  function reset() { setStage('form'); setProof(undefined); setNotice(null); setErrors({}) }
  return { draft, updateField, errors, categories, catalogState, retryCatalog: () => setCatalogAttempt(n => n + 1), stage, proof, busy, busyAction, notice, resent, action, reset }
}
export const statusCopy = {
  pending: ['Revisá tu correo', 'Enviamos un enlace de verificación a ', 'Verificá tu email', 'Abrí el enlace del correo para continuar con tu registro.', 'Reenviar email', 'info'],
  verifying: ['Verificando tu email', 'Estamos comprobando el enlace de verificación.', 'Verificación en curso', 'Esperá unos segundos.', 'Verificando…', 'info'],
  verified: ['Email verificado', 'Completá el registro para activar tu cuenta de jugador.', 'Verificación completada', 'Ya podés completar tu registro.', 'Completar registro', 'success'],
  invalid: ['No pudimos verificar tu email', 'Volvé al registro para continuar.', 'Enlace no válido', 'El enlace no es válido. Volvé al registro para continuar.', 'Volver al registro', 'error'],
  expired: ['El enlace venció', 'Solicitá un nuevo enlace para verificar tu email.', 'Verificación pendiente', 'Solicitá un nuevo email para continuar con tu registro.', 'Reenviar email', 'warning'],
  verifyError: ['No pudimos verificar tu email', 'Intentá verificar tu email de nuevo.', 'Verificación no completada', 'Revisá tu conexión e intentá de nuevo.', 'Reintentar', 'error'],
  active: ['Tu cuenta está lista', 'Ya podés iniciar sesión como jugador.', 'Registro completado', 'Tu cuenta de jugador está activa.', 'Iniciar sesión', 'success'],
  activating: ['Activando tu cuenta', 'Estamos completando tu registro.', 'Activación en curso', 'Esperá unos segundos.', 'Activando…', 'info'],
  activationError: ['No pudimos activar tu cuenta', 'Completá el registro para activar tu cuenta de jugador.', 'La activación no se completó', 'Tu email está verificado. Intentá completar el registro de nuevo.', 'Reintentar', 'error'],
} as const
