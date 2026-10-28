import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Registration } from '@/features/events/types'
import type { EnrollmentFormMode } from '@/features/events/hooks/use-enrollment-form'

type EnrollmentModalContextValue = {
  isOpen: boolean
  mode: EnrollmentFormMode
  registration?: Registration
  openCreate: () => void
  openEdit: (registration: Registration) => void
  close: () => void
}

const EnrollmentModalContext = createContext<EnrollmentModalContextValue | undefined>(undefined)

export function EnrollmentModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<EnrollmentFormMode>('create')
  const [registration, setRegistration] = useState<Registration | undefined>()

  const openCreate = useCallback(() => {
    setMode('create')
    setRegistration(undefined)
    setIsOpen(true)
  }, [])

  const openEdit = useCallback((nextRegistration: Registration) => {
    setMode('edit')
    setRegistration(nextRegistration)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo(
    () => ({ isOpen, mode, registration, openCreate, openEdit, close }),
    [isOpen, mode, registration, openCreate, openEdit, close],
  )

  return <EnrollmentModalContext.Provider value={value}>{children}</EnrollmentModalContext.Provider>
}

export function useEnrollmentModal() {
  const ctx = useContext(EnrollmentModalContext)
  if (!ctx) throw new Error('useEnrollmentModal must be used within EnrollmentModalProvider')
  return ctx
}
